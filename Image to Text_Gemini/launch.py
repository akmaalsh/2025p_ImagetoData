import os
import subprocess
import sys
import webbrowser
import time
from pathlib import Path

def launch_servers():
    # Get the absolute path of the project directory
    project_dir = Path(__file__).parent.absolute()
    backend_dir = project_dir / "backend"
    frontend_dir = project_dir / "frontend"

    print("🚀 Launching Image to Text application (Gemini Edition)...")

    # --- Start Backend Server ---
    print("\n📡 Starting backend server (Gemini Version)...")
    backend_process = subprocess.Popen(
        ["node", "server.js"], # Assumes 'node' is in your system's PATH
        cwd=backend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, # Capture stderr separately for backend
        text=True,
        bufsize=1,
        universal_newlines=True
    )

    # Give backend a moment to initialize and print its listening message
    time.sleep(2)
    backend_listening_message_found = False
    if backend_process.stdout:
        try:
            # Non-blocking read, check a few times
            for _ in range(5):
                line = backend_process.stdout.readline().strip()
                if line:
                    print(f"Backend output: {line}")
                    if "listening at" in line:
                        backend_listening_message_found = True
                        break
                time.sleep(0.2)
        except Exception as e:
            print(f"Could not read initial backend stdout: {e}")
    
    if not backend_listening_message_found:
        print("Backend process started. Check for 'listening at' message if issues occur.")


    # --- Start Frontend Server ---
    print("\n🌐 Starting frontend server...")
    
    intended_frontend_port = "3000" # The port we want `npx serve` to use
    fallback_frontend_url = f"http://localhost:{intended_frontend_port}"
    actual_frontend_url = fallback_frontend_url # Initialize with fallback

    frontend_process = subprocess.Popen(
        ["npx", "serve", "-l", intended_frontend_port], # Explicitly suggest port 3000
        cwd=frontend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT, # Combine stdout and stderr to catch all messages from `serve`
        text=True,
        bufsize=1,
        universal_newlines=True
    )

    print(f"Frontend server process started. Waiting for URL confirmation (attempting port {intended_frontend_port})...")

    url_found_in_output = False
    max_wait_time_frontend = 10  # seconds to wait for URL from frontend server output
    frontend_start_time = time.time()
    
    while time.time() - frontend_start_time < max_wait_time_frontend:
        if frontend_process.stdout:
            line = frontend_process.stdout.readline().strip()
            if line:
                print(f"Frontend output: {line}")
                # Common pattern for `npx serve`: "INFO Accepting connections at http://localhost:XXXXX"
                if "Accepting connections at" in line:
                    parts = line.split(" ")
                    for part in parts:
                        if part.startswith("http"):
                            actual_frontend_url = part
                            url_found_in_output = True
                            break
                # Alternative pattern: "Available on: http://localhost:XXXXX"
                elif "Available on:" in line:
                    parts = line.split(" ")
                    if parts[-1].startswith("http"): # Usually the last part
                        actual_frontend_url = parts[-1]
                        url_found_in_output = True
                
                if url_found_in_output:
                    break # Exit loop once URL is found
            else: 
                # If readline returns empty, check if process ended
                if frontend_process.poll() is not None:
                    print("Frontend server process ended unexpectedly while waiting for URL.")
                    break 
        time.sleep(0.2) # Small delay before reading next line or checking time

    if url_found_in_output:
        print(f"✨ Frontend URL detected: {actual_frontend_url}")
    else:
        print(f"⚠️  Could not reliably detect exact frontend URL from 'npx serve' output after {max_wait_time_frontend}s.")
        print(f"    Will attempt to open the fallback URL: {fallback_frontend_url}")
        print(f"    Please check the frontend server output above for the correct URL if this fails.")
        # actual_frontend_url remains fallback_frontend_url if not found

    # --- Open Browser and Display Info ---
    print(f"\n🌐 Opening browser at {actual_frontend_url} ...")
    webbrowser.open(actual_frontend_url)

    # IMPORTANT: Ensure this port matches the port configured in your backend/server.js
    backend_port = 3002 
    print("\n✅ Application is running!")
    print(f"Frontend should be available at: {actual_frontend_url}")
    print(f"Backend (Gemini Version) is running at: http://localhost:{backend_port}")
    print("\n📝 If the page doesn't open automatically, copy and paste the frontend URL into your browser.")
    print("\nTo stop the servers, press Ctrl+C in this terminal window.")

    # --- Relay Server Output and Wait for KeyboardInterrupt ---
    try:
        while True:
            # Check and print backend output
            if backend_process.stdout:
                backend_line = backend_process.stdout.readline()
                if backend_line:
                    print("Backend:", backend_line.strip())
            if backend_process.stderr:
                backend_err_line = backend_process.stderr.readline()
                if backend_err_line:
                    print("Backend ERR:", backend_err_line.strip())
            
            # Check and print frontend output (already combined stdout/stderr)
            if frontend_process.stdout:
                frontend_line = frontend_process.stdout.readline()
                if frontend_line:
                    print("Frontend:", frontend_line.strip())
            
            # Check if processes have terminated
            if backend_process.poll() is not None:
                print("Backend server process has terminated.")
                break
            if frontend_process.poll() is not None:
                print("Frontend server process has terminated.")
                break
            
            time.sleep(0.1) # Prevent high CPU usage

    except KeyboardInterrupt:
        print("\n\n🛑 Ctrl+C received. Stopping servers...")
    except Exception as e:
        print(f"\nAn error occurred while relaying server output: {e}")
    finally:
        print("Terminating server processes...")
        if backend_process.poll() is None: # If still running
            backend_process.terminate()
            backend_process.wait(timeout=5) # Wait for termination
            if backend_process.poll() is None: # If still running after terminate
                 print("Backend process did not terminate gracefully, killing.")
                 backend_process.kill()
        print("Backend server stopped.")

        if frontend_process.poll() is None: # If still running
            frontend_process.terminate()
            frontend_process.wait(timeout=5)
            if frontend_process.poll() is None:
                print("Frontend process did not terminate gracefully, killing.")
                frontend_process.kill()
        print("Frontend server stopped.")
        
        print("👋 Goodbye!")

if __name__ == "__main__":
    launch_servers()