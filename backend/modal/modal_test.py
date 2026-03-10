import modal

app = modal.App("modal-dev-test")


@app.function()
def square(x):
    print("This code is running on a remote worker!")
    return x**2


@app.local_entrypoint()
def main():
    print("the square is", square.remote(42))

if __name__ == "__main__":
    with app.run():
        main()

