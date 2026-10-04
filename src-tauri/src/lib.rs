use tauri::{
    webview::PageLoadEvent, Manager, WebviewUrl, WebviewWindowBuilder,
};

#[tauri::command]
async fn open_module_window(app: tauri::AppHandle, module: String) -> Result<(), String> {
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

    let module_script = format!(
        "window.__ADEGA_DESKTOP_MODULE__ = {};",
        serde_json::to_string(&module).map_err(|error| error.to_string())?
    );
    WebviewWindowBuilder::new(&app, label, WebviewUrl::App("index.html".into()))
        .initialization_script(module_script)
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
        .on_page_load(|webview, payload| {
            if webview.label() != "main" || payload.event() != PageLoadEvent::Finished {
                return;
            }

            let app = webview.app_handle();
            if let Some(splashscreen) = app.get_webview_window("splashscreen") {
                let _ = splashscreen.close();

                if let Some(main_window) = app.get_webview_window("main") {
                    let _ = main_window.show();
                    let _ = main_window.set_focus();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o ADEGA PRO");
}
