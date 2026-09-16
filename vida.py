import sys


def main():
    if len(sys.argv) != 3:
        sys.exit("Uso: python3 vida.py <archivo_estado_inicial> <generaciones>")

    try:
        generaciones = int(sys.argv[2])
    except ValueError:
        sys.exit("Error: <generaciones> debe ser un entero")

    if generaciones < 0:
        sys.exit("Error: <generaciones> debe ser mayor o igual a cero")

    with open(sys.argv[1], "r") as archivo:
        grilla = archivo.read().splitlines()

    if not grilla:
        return

    alto = len(grilla)
    ancho = len(grilla[0])

    for _ in range(generaciones):
        siguiente = [["."] * ancho for _ in range(alto)]
        for fila in range(alto):
            for col in range(ancho):
                vecinas = 0
                for df in (-1, 0, 1):
                    for dc in (-1, 0, 1):
                        if df == 0 and dc == 0:
                            continue
                        nf = fila + df
                        nc = col + dc
                        if 0 <= nf < alto and 0 <= nc < ancho and grilla[nf][nc] == "#":
                            vecinas += 1
                if grilla[fila][col] == "#":
                    if vecinas == 2 or vecinas == 3:
                        siguiente[fila][col] = "#"
                elif vecinas == 3:
                    siguiente[fila][col] = "#"
        grilla = ["".join(fila) for fila in siguiente]

    sys.stdout.write("\n".join(grilla) + "\n")


if __name__ == "__main__":
    main()
