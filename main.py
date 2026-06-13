import webview
import threading
import uvicorn
import socket
import time
import sys
import os

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def start_server():
    from server import app
    # Run server on port 3000 to match original Electron config
    uvicorn.run(app, host="127.0.0.1", port=3000, log_level="warning")

if __name__ == '__main__':
    # Start FastAPI in background
    server_thread = threading.Thread(target=start_server)
    server_thread.daemon = True
    server_thread.start()
    
    # Wait for port 3000 to be open
    retries = 30
    while not is_port_in_use(3000) and retries > 0:
        time.sleep(0.2)
        retries -= 1
        
    # Create window with title "no more human!!" and default dimensions 1200x800
    webview.create_window(
        'no more human!!', 
        'http://localhost:3000', 
        width=1200, 
        height=800,
        resizable=True
    )
    
    webview.start()
    sys.exit(0)
