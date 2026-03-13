import json
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.code_generator import graph_json_to_code

def main():
    json_path = os.path.join(os.path.dirname(__file__), "..", "example", "MNIST_Input.json")
    output_path = os.path.join(os.path.dirname(__file__), "generated_mnist_train.py")
    
    print(f"Reading {json_path}...")
    with open(json_path, "r") as f:
        graph = json.load(f)
        
    print("Generating code...")
    code = graph_json_to_code(graph)
    
    print(f"Writing to {output_path}...")
    with open(output_path, "w") as f:
        f.write(code)
        
    print(f"\nSuccess! Generated file saved to: {output_path}")

if __name__ == "__main__":
    main()
