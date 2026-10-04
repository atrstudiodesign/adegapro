use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
fn open_module_window(app: tauri::AppHandle, module: String) -> Result<(), String> {
    let (title, width, height, min_width, min_height) = match module.as_str() {
        "dashboard" => ("ADEGA PRO — Dashboard", 1360.0, 860.0, 1024.0, 700.0),
        "pos" => ("ADEGA PRO — PDV", 1440.0, 900.0, 1100.0, 720.0),
        "sales" => ("ADEGA PRO — Vendas e Cupons", 1280.0, 820.0, 960.0, 640.0),
        "products" => ("ADEGA PRO — Produtos", 1280.0, 820.0, 960.0, 640.0),
        "stock" => ("ADEGA PRO — Estoque", 1280.0, 820.0, 960.0, 640.0),
        "inventory" => ("ADEGA PRO — Inventário", 1280.0, 820.0, 960.0, 640.0),
        "cash" => ("ADEGA PRO — Caixa", 1280.0, 820.0, 960.0, 640.0),
        "purchases" => ("ADEGA PRO — Compras", 1280.0, 820.0, 960.0, 640.0),
        "finance" => ("ADEGA PRO — Financeiro", 1280.0, 820.0, 960.0, 640.0),
        "customers" => ("ADEGA PRO — Clientes", 1280.0, 820.0, 960.0, 640.0),
        "suppliers" => ("ADEGA PRO — Fornecedores", 1280.0, 820.0, 960.0, 640.0),
        "reports" => ("ADEGA PRO — Relatórios", 1360.0, 860.0, 1024.0, 700.0),
        "customer-display" => ("ADEGA PRO — Tela do Cliente", 1200.0, 800.0, 720.0, 480.0),
        _ => return Err("Módulo não autorizado para abertura em janela separada.".into()),
    };

    let label = format!("module-{module}");
    if let Some(window) = app.get_webview_window(&label) {
        window.unminimize().map_err(|error| error.to_string())?;
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        return Ok(());
    }

    let app_url = format!("index.html?desktopModule={module}");
    WebviewWindowBuilder::new(&app, label, WebviewUrl::App(app_url.into()))
        .title(title)
        .inner_size(width, height)
        .min_inner_size(min_width, min_height)
        .resizable(true)
        .center()
        .build()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_module_window])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o ADEGA PRO");
}
