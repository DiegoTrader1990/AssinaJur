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
  'escritorio_nome', 
  'valor_honorarios', 
  'percentual_exito', 
  'cidade', 
  'data_atual'
];

export function DocumentRichEditor({
  value,
  onChange,
  showAiCopilot = true,
  showTags = true,
  placeholder = 'Digite o conteúdo do documento aqui...',
  className = ''
}: DocumentRichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  
  // AI Copilot state
  const [aiCommand, setAiCommand] = useState('');
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [aiWarning, setAiWarning] = useState<string | null>(null);

  // For initial value rendering only once
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      // Only update if it's completely empty (initial load) to avoid cursor jumping
      if (!editorRef.current.innerHTML || value === '') {
        editorRef.current.innerHTML = value;
      }
    }
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      onChange(editorRef.current.innerHTML);
    }
  };

  const insertTag = (tag: string) => {
    const tagText = `{{${tag}}}`;
    
    // Focus the editor before inserting if it doesn't have focus
    if (document.activeElement !== editorRef.current && editorRef.current) {
      editorRef.current.focus();
    }
    
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

    try {
      const response = await fetch('/api/templates/ai-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentHtml: currentHtml,
          command: aiCommand,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao processar edição com IA');
      }

      const data = await response.json();
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
      console.error('Erro na IA Copilot:', error);
      setAiWarning(error?.message || 'Ocorreu um erro ao tentar usar a IA. Tente novamente.');
    } finally {
      setIsProcessingAi(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs ${className}`}>
      {/* Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap gap-1 items-center">
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
          onClick={() => executeCommand('justifyLeft')}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          title="Alinhar à esquerda"
          type="button"
        >
          <AlignLeft size={16} />
        </button>
        <button 
          onClick={() => executeCommand('justifyCenter')}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          title="Centralizar"
          type="button"
        >
          <AlignCenter size={16} />
        </button>
        <button 
          onClick={() => executeCommand('justifyRight')}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          title="Alinhar à direita"
          type="button"
        >
          <AlignRight size={16} />
        </button>
        <button 
          onClick={() => executeCommand('justifyFull')}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
          title="Justificar"
          type="button"
        >
          <AlignJustify size={16} />
        </button>
      </div>

      {/* Editor Area */}
      <div 
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="min-h-[300px] p-4 font-serif text-sm text-slate-800 focus:outline-none prose max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none"
        dangerouslySetInnerHTML={{ __html: value }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

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
