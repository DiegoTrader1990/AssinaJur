using Syncfusion.EJ2.DocumentEditor;
using Syncfusion.DocIO;
using Syncfusion.DocIO.DLS;
using Syncfusion.DocIORenderer;
using Syncfusion.Licensing;

var builder = WebApplication.CreateBuilder(args);
var licenseKey = Environment.GetEnvironmentVariable("SYNCFUSION_LICENSE");
if (!string.IsNullOrWhiteSpace(licenseKey)) SyncfusionLicenseProvider.RegisterLicense(licenseKey);
var allowedOrigins = new[] { "https://www.assinajur.com.br", "https://assinajur.com.br", "https://assinajur.vercel.app", "http://localhost:3000" };
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseCors();

// Este serviço fica no computador do escritório. Ele só transforma DOCX em SFDT
// para o editor web; os arquivos continuam protegidos pelo AssinaJur.
app.MapGet("/health", () => Results.Ok(new { ready = true, service = "AssinaJur Word" }));

app.MapPost("/api/documenteditor/import", async (HttpRequest request) =>
{
    var form = await request.ReadFormAsync();
    var file = form.Files.FirstOrDefault();
    if (file is null || file.Length == 0) return Results.BadRequest(new { error = "Envie um arquivo DOCX." });
    await using var input = new MemoryStream();
    await file.CopyToAsync(input);
    input.Position = 0;
    var document = Syncfusion.EJ2.DocumentEditor.WordDocument.Load(input, Syncfusion.EJ2.DocumentEditor.FormatType.Docx);
    return Results.Text(Newtonsoft.Json.JsonConvert.SerializeObject(document), "application/json");
});

app.MapPost("/api/documenteditor/export-pdf", async (SfdtPayload payload) =>
{
    if (string.IsNullOrWhiteSpace(payload.Content)) return Results.BadRequest(new { error = "Documento vazio." });
    using var docx = Syncfusion.EJ2.DocumentEditor.WordDocument.Save(payload.Content, Syncfusion.EJ2.DocumentEditor.FormatType.Docx);
    using var document = new Syncfusion.DocIO.DLS.WordDocument(docx, "docx");
    using var renderer = new DocIORenderer();
    using var pdf = renderer.ConvertToPDF(document);
    await using var output = new MemoryStream();
    pdf.Save(output);
    return Results.File(output.ToArray(), "application/pdf", "previa-modelo.pdf");
});

app.Run("http://127.0.0.1:5127");

record SfdtPayload(string Content);
