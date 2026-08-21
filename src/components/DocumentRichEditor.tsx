'use client';

import React, { useRef, useState, useEffect, FormEvent } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Heading1, 
  Heading2, 
  Pilcrow, 
  ListOrdered, 
  List, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  Undo2,
  Redo2,
  RemoveFormatting,
  Code, 
  Sparkles, 
  Loader2, 
  Send, 
  Wand2 
} from 'lucide-react';

interface DocumentRichEditorProps {
  value: string;
  onChange: (html: string) => void;
  showAiCopilot?: boolean;
  showTags?: boolean;
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  plainDocumentMode?: boolean;
}

const AVAILABLE_TAGS = [
  'cliente_nome', 
  'cliente_cpf', 
  'cliente_rg', 
  'cliente_nacionalidade', 
  'cliente_telefone', 
  'cliente_endereco', 
  'cliente_estado_civil', 
  'cliente_profissao', 
  'advogado_nome', 
  'advogado_oab', 
  'advogada_nome',
  'advogada_oab',
  'escritorio_nome', 
  'escritorio_cnpj',
  'escritorio_endereco',
  'escritorio_telefone',
  'escritorio_email',
  'escritorio_qualificacao',
  'patronos_qualificacao_conjunta',
  'valor_honorarios', 
  'percentual_exito', 
  'cidade', 
  'data_atual'
];

const FONT_OPTIONS = [
  { value: 'Helvetica', label: 'Helvetica (padrão PDF)' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
];

const FONT_SIZE_OPTIONS = [
  { value: '2', label: '10 pt (padrão)' },
  { value: '3', label: '12 pt' },
  { value: '4', label: '14 pt' },
  { value: '5', label: '18 pt' },
  { value: '6', label: '24 pt' },
];

export function DocumentRichEditor({
  value,
  onChange,
  showAiCopilot = true,
  showTags = true,
  placeholder = 'Digite o conteúdo do documento aqui...',
  className = '',
  contentClassName = '',
  plainDocumentMode = false,
}: DocumentRichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  
  // AI Copilot state
  const [aiCommand, setAiCommand] = useState('');
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [aiWarning, setAiWarning] = useState<string | null>(null);

  // Track first render and external updates without resetting DOM selection
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (editorRef.current) {
      if (isFirstRender.current) {
        editorRef.current.innerHTML = value || '';
        isFirstRender.current = false;
      } else {
        // Only update innerHTML if value changed externally AND editor is not active user focus
        const isFocused = document.activeElement === editorRef.current;
        if (!isFocused && editorRef.current.innerHTML !== value) {
          editorRef.current.innerHTML = value || '';
        }
      }
    }
  }, [value]);

  useEffect(() => {
    const rememberSelection = () => {
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      if (range && editorRef.current?.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    };
    document.addEventListener('selectionchange', rememberSelection);
    return () => document.removeEventListener('selectionchange', rememberSelection);
  }, []);

  const restoreEditorSelection = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    if (!savedRangeRef.current) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(savedRangeRef.current);
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Sem isso, cada navegador escolhe uma tag diferente para o Enter (<div> em
    // alguns, <p> em outros), o que fazia o mesmo texto quebrar/espaçar de um jeito
    // no editor do Modelo e de outro jeito no editor da Revisão do Kit. Forçamos
    // sempre <p>, igual nas duas telas, antes de processar a tecla.
    document.execCommand('defaultParagraphSeparator', false, 'p');
    // Enter mantém a edição em parágrafos; Shift+Enter cria uma quebra curta dentro do texto.
    // Ambos são convertidos corretamente na prévia e no PDF.
    if (event.key !== 'Enter' || !event.shiftKey) return;
    event.preventDefault();
    document.execCommand('insertLineBreak');
    handleInput();
  };

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    restoreEditorSelection();
    const editor = editorRef.current;
    if (!editor) return;

    // O comando nativo do navegador (document.execCommand) para negrito/itálico/
    // fonte/tamanho às vezes reconstrói os nós de texto da seleção e, quando a
    // seleção termina bem na borda de uma variável {{cliente_nome}}, {{cidade}}
    // etc., pode apagar esse trecho junto - foi o que causava o rodapé de
    // assinatura perder a variável ao aplicar formatação. Comparamos as
    // variáveis antes/depois e desfazemos a formatação se alguma sumiu, em vez
    // de deixar a perda passar silenciosamente.
    const beforeHtml = editor.innerHTML;
    const beforeTags = Array.from(new Set(beforeHtml.match(/{{[^}]+}}/g) || []));

    // Forçamos a marcação semântica <strong>, que também é entendida pelo gerador de PDF.
    if (command === 'bold') document.execCommand('styleWithCSS', false, 'false');
    document.execCommand(command, false, value);

    const afterHtml = editor.innerHTML;
    const afterTags = Array.from(new Set(afterHtml.match(/{{[^}]+}}/g) || []));
    const missingTags = beforeTags.filter((tag) => !afterTags.includes(tag));

    if (missingTags.length > 0) {
      editor.innerHTML = beforeHtml;
      setAiWarning(`Formatação desfeita: apagaria a(s) variável(is) ${missingTags.join(', ')}. Selecione um trecho que não corte o {{...}} e tente novamente.`);
      onChange(beforeHtml);
      return;
    }

    onChange(afterHtml);
  };

  // Fonte e tamanho NÃO usam mais document.execCommand('fontName'/'fontSize'):
  // essa API antiga do navegador tem um bug conhecido em que, ao aplicar a
  // formatação numa seleção que cobre o conteúdo inteiro de um bloco (ex.:
  // título em <h1> selecionado com triplo-clique), o texto selecionado é
  // apagado em vez de envolvido pela tag de fonte - foi o que fazia o título
  // (e outros trechos) sumir ao trocar a fonte/tamanho no editor. Em vez de
  // depender do execCommand, extraímos manualmente o conteúdo selecionado e o
  // reinserimos dentro de uma tag <font>, preservando sempre o texto.
  const applyFontToSelection = (attribute: 'face' | 'size', value: string) => {
    restoreEditorSelection();
    const editor = editorRef.current;
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!editor || !range || range.collapsed || !editor.contains(range.commonAncestorContainer)) {
      setAiWarning('Selecione um trecho de texto antes de trocar a fonte ou o tamanho.');
      return;
    }

    const beforeHtml = editor.innerHTML;
    try {
      const fragment = range.extractContents();
      const font = document.createElement('font');
      font.setAttribute(attribute, value);
      font.appendChild(fragment);
      range.insertNode(font);

      // Reseleciona o conteúdo recém-formatado, para permitir aplicar mais de
      // um atributo em sequência (ex.: fonte e depois tamanho) sem perder a seleção.
      const newRange = document.createRange();
      newRange.selectNodeContents(font);
      selection?.removeAllRanges();
      selection?.addRange(newRange);
      savedRangeRef.current = newRange.cloneRange();
    } catch (err) {
      console.error('Erro ao aplicar fonte/tamanho:', err);
      editor.innerHTML = beforeHtml;
      setAiWarning('Não foi possível aplicar a formatação nesse trecho. Tente selecionar novamente.');
      onChange(beforeHtml);
      return;
    }

    const afterHtml = editor.innerHTML;
    const beforeTags = Array.from(new Set(beforeHtml.match(/{{[^}]+}}/g) || []));
    const afterTags = Array.from(new Set(afterHtml.match(/{{[^}]+}}/g) || []));
    const missingTags = beforeTags.filter((tag) => !afterTags.includes(tag));
    if (missingTags.length > 0) {
      editor.innerHTML = beforeHtml;
      setAiWarning(`Formatação desfeita: apagaria a(s) variável(is) ${missingTags.join(', ')}. Selecione um trecho que não corte o {{...}} e tente novamente.`);
      onChange(beforeHtml);
      return;
    }

    onChange(afterHtml);
  };

  const applyAlignment = (alignment: 'left' | 'center' | 'right' | 'justify') => {
    restoreEditorSelection();
    const editor = editorRef.current;
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!editor || !range) return;

    const beforeHtml = editor.innerHTML;
    const beforeTags = Array.from(new Set(beforeHtml.match(/{{[^}]+}}/g) || []));

    const blocks = Array.from(editor.querySelectorAll<HTMLElement>('p, div, h1, h2, h3, li'))
      .filter((block) => range.intersectsNode(block));
    if (blocks.length) {
      blocks.forEach((block) => { block.style.textAlign = alignment; });
    } else {
      const parent = range.startContainer.nodeType === Node.ELEMENT_NODE
        ? range.startContainer as HTMLElement
        : range.startContainer.parentElement;
      const block = parent?.closest<HTMLElement>('p, div, h1, h2, h3, li');
      if (block && editor.contains(block)) block.style.textAlign = alignment;
      else document.execCommand(({ left: 'justifyLeft', center: 'justifyCenter', right: 'justifyRight', justify: 'justifyFull' } as const)[alignment], false);
    }

    const afterHtml = editor.innerHTML;
    const afterTags = Array.from(new Set(afterHtml.match(/{{[^}]+}}/g) || []));
    const missingTags = beforeTags.filter((tag) => !afterTags.includes(tag));
    if (missingTags.length > 0) {
      editor.innerHTML = beforeHtml;
      setAiWarning(`Alinhamento desfeito: apagaria a(s) variável(is) ${missingTags.join(', ')}. Selecione um trecho que não corte o {{...}} e tente novamente.`);
      onChange(beforeHtml);
      return;
    }
    onChange(afterHtml);
  };

  const insertTag = (tag: string) => {
    const tagText = `{{${tag}}}`;
    
    // Focus the editor before inserting if it doesn't have focus
    restoreEditorSelection();
    
    document.execCommand('insertText', false, tagText);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleAiEdit = async (e?: any) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!aiCommand.trim() || !editorRef.current) return;

    const currentHtml = editorRef.current.innerHTML;
    
    // Extract tags from current html to check if they are preserved
    const currentTagsMatch = currentHtml.match(/{{[^}]+}}/g) || [];
    const currentTags = Array.from(new Set(currentTagsMatch));

    setIsProcessingAi(true);
    setAiWarning(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch('/api/templates/ai-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          contentHtml: currentHtml,
          command: aiCommand,
        }),
      });
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao processar edição com IA');
      }

      const updatedHtml = data.contentHtml || data.html;
      
      if (updatedHtml) {
        editorRef.current.innerHTML = updatedHtml;
        onChange(updatedHtml);
        
        // Check for missing tags
        const newTagsMatch = updatedHtml.match(/{{[^}]+}}/g) || [];
        const newTags = Array.from(new Set(newTagsMatch));
        
        const missingTags = currentTags.filter(tag => !newTags.includes(tag));
        if (missingTags.length > 0) {
          setAiWarning(`Atenção: Algumas variáveis foram removidas pela IA: ${missingTags.join(', ')}`);
        }
        
        setAiCommand('');
      } else {
        throw new Error(data.error || 'A IA não retornou o HTML formatado');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Erro na IA Copilot:', error);
      if (error?.name === 'AbortError') {
        setAiWarning('O tempo de resposta da IA excedeu o limite. Tente enviar um trecho menor ou refazer o pedido.');
      } else {
        setAiWarning(error?.message || 'Ocorreu um erro ao tentar usar a IA. Tente novamente.');
      }
    } finally {
      setIsProcessingAi(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs ${className}`}>
      {/* Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap gap-1 items-center" onMouseDown={(event) => { if ((event.target as HTMLElement).closest('button')) event.preventDefault(); }}>
        <button onClick={() => executeCommand('undo')} className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors" title="Desfazer" type="button"><Undo2 size={16} /></button>
        <button onClick={() => executeCommand('redo')} className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors" title="Refazer" type="button"><Redo2 size={16} /></button>
        <div className="w-px h-6 bg-slate-300 mx-1"></div>
        <label className="flex items-center gap-1.5 px-2 text-[11px] font-semibold text-slate-600" title="Selecione o texto antes de trocar a fonte">
          Fonte
          <select
            defaultValue="Helvetica"
            onChange={(event) => applyFontToSelection('face', event.target.value)}
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none focus:border-blue-500"
          >
            {FONT_OPTIONS.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1.5 px-2 text-[11px] font-semibold text-slate-600" title="Selecione o texto antes de alterar o tamanho">
          Tamanho
          <select
            defaultValue="2"
            onChange={(event) => applyFontToSelection('size', event.target.value)}
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none focus:border-blue-500"
          >
            {FONT_SIZE_OPTIONS.map((size) => <option key={size.value} value={size.value}>{size.label}</option>)}
          </select>
        </label>
        <div className="w-px h-6 bg-slate-300 mx-1"></div>
        <button 
          onClick={() => executeCommand('bold')}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          title="Negrito"
          type="button"
        >
          <Bold size={16} />
        </button>
        <button 
          onClick={() => executeCommand('italic')}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          title="Itálico"
          type="button"
        >
          <Italic size={16} />
        </button>
        <button 
          onClick={() => executeCommand('underline')}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          title="Sublinhado"
          type="button"
        >
          <Underline size={16} />
        </button>
        <label className="relative flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-200" title="Cor do texto">
          Cor
          <input type="color" defaultValue="#1e293b" onChange={(event) => executeCommand('foreColor', event.target.value)} className="h-4 w-4 cursor-pointer border-0 bg-transparent p-0" />
        </label>
        <button onClick={() => executeCommand('removeFormat')} className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors" title="Limpar formatação do texto selecionado" type="button"><RemoveFormatting size={16} /></button>
        
        <div className="w-px h-6 bg-slate-300 mx-1"></div>
        
        <button 
          onClick={() => executeCommand('formatBlock', 'h1')}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          title="Título H1"
          type="button"
        >
          <Heading1 size={16} />
        </button>
        <button 
          onClick={() => executeCommand('formatBlock', 'h2')}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          title="Título H2"
          type="button"
        >
          <Heading2 size={16} />
        </button>
        <button 
          onClick={() => executeCommand('formatBlock', 'p')}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          title="Parágrafo"
          type="button"
        >
          <Pilcrow size={16} />
        </button>
        
        <div className="w-px h-6 bg-slate-300 mx-1"></div>
        
        <button 
          onClick={() => executeCommand('insertOrderedList')}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          title="Lista numerada"
          type="button"
        >
          <ListOrdered size={16} />
        </button>
        <button 
          onClick={() => executeCommand('insertUnorderedList')}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          title="Lista com marcadores"
          type="button"
        >
          <List size={16} />
        </button>
        
        <div className="w-px h-6 bg-slate-300 mx-1"></div>
        
        <button 
          onClick={() => applyAlignment('left')}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          title="Alinhar à esquerda"
          type="button"
        >
          <AlignLeft size={16} />
        </button>
        <button 
          onClick={() => applyAlignment('center')}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          title="Centralizar"
          type="button"
        >
          <AlignCenter size={16} />
        </button>
        <button 
          onClick={() => applyAlignment('right')}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          title="Alinhar à direita"
          type="button"
        >
          <AlignRight size={16} />
        </button>
        <button 
          onClick={() => applyAlignment('justify')}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          title="Justificar"
          type="button"
        >
          <AlignJustify size={16} />
        </button>
        <span className="ml-auto px-2 text-[10px] font-medium text-slate-500">Enter: novo parágrafo · Shift + Enter: quebra de linha</span>
      </div>

      <div className="overflow-auto bg-slate-100 p-4 sm:p-6">
      <div 
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        onKeyDown={handleEditorKeyDown}
        className={`min-h-[1123px] w-full max-w-[794px] mx-auto bg-white p-[53px] text-slate-800 shadow-sm focus:outline-none [&_p]:m-0 [&_p]:mb-[7px] [&_div]:mb-[7px] [&_h1]:m-0 [&_h1]:mb-[16px] [&_h1]:text-center [&_h1]:text-[16px] [&_h1]:leading-[22px] [&_h1]:font-bold [&_h2]:m-0 [&_h2]:mb-[8px] [&_h2]:text-[14.4px] [&_h2]:leading-[21px] [&_h2]:font-bold ${plainDocumentMode ? '' : ''} empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none ${contentClassName}`}
        style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '10pt', lineHeight: '15pt', boxSizing: 'border-box' }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      </div>

      {/* Tags Panel */}
      {showTags && (
        <div className="bg-slate-50 border-t border-slate-200 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Code size={14} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-heading">
              Variáveis Disponíveis
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => insertTag(tag)}
                type="button"
                className="px-2.5 py-1 bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 rounded-lg text-[11px] font-mono text-slate-700 font-semibold transition-colors"
              >
                {`{{${tag}}}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Copilot Panel */}
      {showAiCopilot && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-200 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-blue-600" />
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider font-heading">
              IA Copilot
            </span>
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={aiCommand}
                onChange={(e) => setAiCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAiEdit(e);
                  }
                }}
                placeholder="Ex: Remova dados pessoais e substitua por variáveis ou altere honorários..."
                className="w-full pl-3 pr-10 py-2 rounded-xl border border-blue-200 focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50 text-sm outline-none transition-all"
                disabled={isProcessingAi}
              />
            </div>
            <button
              type="button"
              onClick={handleAiEdit}
              disabled={isProcessingAi || !aiCommand.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold font-heading flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessingAi ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Wand2 size={16} />
                  Aplicar
                </>
              )}
            </button>
          </div>
          
          {aiWarning && (
            <div className="mt-2 text-xs text-amber-600 font-medium bg-amber-50 p-2 rounded-lg border border-amber-200">
              {aiWarning}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
