import gradio as gr

from modules import script_callbacks


TAB_TITLE = "Background Prompter"
TAB_ID = "background_prompter"


def on_ui_tabs():
    with gr.Blocks() as backgrounds_ui:
        gr.HTML(
            '<div id="k2bg-app" class="k2bg-app" aria-live="polite">'
            '<div class="k2bg-loading">Loading Background Prompter...</div>'
            "</div>",
            elem_id="k2bg_mount",
        )

    return [(backgrounds_ui, TAB_TITLE, TAB_ID)]


script_callbacks.on_ui_tabs(on_ui_tabs)
