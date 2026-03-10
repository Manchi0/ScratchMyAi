import json
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import modal
from services.code_generator import graph_json_to_code

torch_image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "torch", "torchvision"
)

app = modal.App.lookup("scratch-my-ai", create_if_missing=True)


def main():
    # Step 1: Load the JSON and generate the training code
    json_path = os.path.join(os.path.dirname(__file__), "..", "example", "MNIST_Input.json")
    print(f"[1/3] Loading {json_path}...")
    with open(json_path, "r") as f:
        graph = json.load(f)

    print("[2/3] Generating PyTorch training code...")
    code = graph_json_to_code(graph)

    # Save a local copy for reference
    local_copy = os.path.join(os.path.dirname(__file__), "generated_mnist_train.py")
    with open(local_copy, "w") as f:
        f.write(code)
    print(f"      Local copy saved to: {local_copy}")

    # Step 2: Run the generated code on Modal with a GPU
    print("[3/3] Sending to Modal for remote execution...")
    print("=" * 60)

    sandbox = modal.Sandbox.create(
        "python", "-c", code,
        app=app,
        image=torch_image,
        gpu="any",
        timeout=600,
    )

    # Stream stdout and stderr in real-time
    for message in sandbox.stdout:
        print(f"  [Modal] {message}", end="")

    for message in sandbox.stderr:
        print(f"  [Modal stderr] {message}", end="")

    sandbox.wait()
    exit_code = sandbox.returncode
    sandbox.terminate()
    print("=" * 60)

    if exit_code == 0:
        print("\nModal execution completed successfully!")
    else:
        print(f"\nModal execution failed with exit code {exit_code}")
        sys.exit(1)


if __name__ == "__main__":
    main()
