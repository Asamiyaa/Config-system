"""Single-click launcher opens browser after server starts."""
import threading, time, webbrowser
import uvicorn
from . import config

def open_ui():
    time.sleep(1.8)
    webbrowser.open(f'http://127.0.0.1:{config.PORT}')

if __name__=='__main__':
    threading.Thread(target=open_ui,daemon=True).start()
    uvicorn.run('app.main:app',host=config.HOST,port=config.PORT,workers=1,reload=False)
