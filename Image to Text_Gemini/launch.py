import os
import subprocess
import sys
import webbrowser
import time
from pathlib import Path

def launch_servers():
    project_dir = Path(__file__).parent.absolute()
    backend_dir = project_dir / "backend"
    frontend_dir = project_dir / "frontend"

    print("🚀 Launching Image to Text application (Gemini Edition)...")

    print("\n📡 Starting backend server (Gemini Version)...")
    # Ensure Node.js is in your PATH
    backend_process = subprocess.Popen(
        ["node", "server.js"],
        cwd=backend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
        universal_newlines=True
    )

    time.sleep(2) # Give backend a moment to start
    # Try to read a line to confirm startup, but don't hang if it doesn't print immediately
    try:
        backend_output = backend_process.stdout.readline().strip()
        if backend_output:
            print(f"Backend: {backend_output}")
        else:
            print("Backend started (no immediate output).")
    except Exception as e:
        print(f"Could not read backend initial output: {e}")


    print("\n🌐 Starting frontend server...")
    # Ensure npx is in your PATH, or use 'python -m http.server [port]' for a simple server if npx/serve isn't standard
    frontend_process = subprocess.Popen(
        ["npx", "serve", "-l", "3000"], # Explicitly setting frontend port to 3000 for `serve`
        cwd=frontend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
        universal_newlines=True
    )

    frontend_url = "http://localhost:3000" # Default if serve is used with -l 3000
    print(f"\n✨ Attempting to use frontend URL: {frontend_url}")
    
    # Wait for frontend to confirm it's serving, or just proceed
    time.sleep(2) 
    try:
        frontend_output = frontend_process.stdout.readline().strip()
        if frontend_output:
            print(f"Frontend: {frontend_output}")
            # You could try to parse the URL from serve's output if it varies
            if "Available on:" in frontend_output: # Common npx serve output
                 urls = [s for s in frontend_output.split(" ") if s.startswith("http")]
                 if urls:
                     frontend_url = urls[0] # Take the first one, usually localhost
                     print(f"Detected frontend URL from serve: {frontend_url}")

        else:
            print("Frontend started (no immediate output, using default URL).")
    except Exception as e:
        print(f"Could not read frontend initial output: {e}")


    print(f"\n🌐 Opening browser at {frontend_url} ...")
    webbrowser.open(frontend_url)

    # IMPORTANT: Update this port if you changed it in backend/server.js
    backend_port = 3002 
    print("\n✅ Application is running!")
    print(f"Frontend should be available at: {frontend_url}")
    print(f"Backend (Gemini Version) is running at: http://localhost:{backend_port}")
    print("\n📝 If the page doesn't open automatically, copy and paste the frontend URL into your browser.")
    print("\nTo stop the servers, press Ctrl+C in this terminal window.")

    try:
        while True:
            # Non-blocking read for backend
            backend_line = backend_process.stdout.readline() if backend_process.stdout else None
            if backend_line:
                print("Backend:", backend_line.strip())
            
            # Non-blocking read for frontend
            frontend_line = frontend_process.stdout.readline() if frontend_process.stdout else None
            if frontend_line:
                print("Frontend:", frontend_line.strip())
            
            if backend_process.poll() is not None or frontend_process.poll() is not None:
                print("One of the servers has stopped.")
                break
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("\n\n🛑 Stopping servers...")
    finally:
        if backend_process.poll() is None:
            backend_process.terminate()
            backend_process.wait()
        if frontend_process.poll() is None:
            frontend_process.terminate()
            frontend_process.wait()
        print("👋 Goodbye!")

if __name__ == "__main__":
    launch_servers()