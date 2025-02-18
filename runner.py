import os
import json
import sys
from io import StringIO
from contextlib import redirect_stdout

DATA_DIR = os.environ.get("DATA_DIR", "/data")

def load_scope():
    try:
        with open(os.path.join(DATA_DIR, "scope.json"), "r") as f:
            return json.load(f)
    except Exception as e:
        return {}

def main():
    scope = load_scope()
    try:
        with open(os.path.join(DATA_DIR, "user_code.py"), "r") as f:
            user_code = f.read()
    except Exception as e:
        print(json.dumps({"error": f"Error reading user_code.py: {e}"}))
        sys.exit(1)
    
    exec_globals = {"__builtins__": __builtins__}
    exec_globals.update(scope)
    
    wrapped_code = "def __user_func__():\n"
    for line in user_code.splitlines():
        wrapped_code += "    " + line + "\n"
    
    try:
        # Execute the wrapped code to define __user_func__
        exec(wrapped_code, exec_globals)
    except Exception as e:
        # If there's an error interpreting the code, no logs have been captured yet.
        print(json.dumps({"error": "Error interpreting user code: " + str(e)}))
        sys.exit(1)
    
    # Create a StringIO to capture stdout
    f = StringIO()
    try:
        with redirect_stdout(f):
            result = exec_globals["__user_func__"]()
    except Exception as e:
        # Capture logs up to the error and return them along with the error message.
        output = f.getvalue().strip()
        logs = output.split('\n') if output else []
        print(json.dumps({"logs": logs, "error": str(e)}))
        sys.exit(1)
    
    # If execution is successful, capture any output logs.
    output = f.getvalue().strip()
    logs = output.split('\n') if output else []
    
    response = {
        "logs": logs,
        "output": result
    }
    
    print(json.dumps(response))

if __name__ == "__main__":
    main()
