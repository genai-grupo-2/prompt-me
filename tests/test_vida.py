import os
import pathlib
import subprocess
import sys
import tempfile
import unittest


if len(sys.argv) > 1:
    VIDA_PATH = pathlib.Path(sys.argv.pop(1)).expanduser().resolve()
else:
    VIDA_PATH = pathlib.Path(__file__).resolve().parent / "vida.py"

if not VIDA_PATH.is_file():
    sys.stderr.write(f"Error: no existe el script vida.py en: {VIDA_PATH}\n")
    raise SystemExit(2)


class VidaTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.estado = pathlib.Path(self.temp_dir.name) / "estado.txt"

    def tearDown(self):
        self.temp_dir.cleanup()

    def ejecutar(self, estado_inicial, generaciones):
        self.estado.write_text(estado_inicial, encoding="utf-8")
        return subprocess.run(
            [
                sys.executable,
                str(VIDA_PATH),
                str(self.estado),
                str(generaciones),
            ],
            capture_output=True,
            text=True,
        )

    def afirmar_grilla(self, resultado, esperada):
        self.assertEqual(
            resultado.returncode,
            0,
            msg=f"vida.py terminó con código {resultado.returncode}: "
            f"{resultado.stderr}",
        )

        salida = resultado.stdout.rstrip("\r\n")
        esperada = esperada.rstrip("\r\n")
        self.assertEqual(salida.split("\n"), esperada.split("\n"))

    def test_blinker_vuelve_al_estado_inicial_despues_de_dos_generaciones(self):
        """El blinker vertical vuelve a su estado inicial tras dos generaciones."""
        estado = (
            ".....\n"
            "..#..\n"
            "..#..\n"
            "..#..\n"
            "....."
        )
        resultado = self.ejecutar(estado, 2)
        self.afirmar_grilla(resultado, estado)

    def test_blinker_queda_horizontal_despues_de_una_generacion(self):
        """El blinker vertical queda horizontal después de una generación."""
        estado = (
            ".....\n"
            "..#..\n"
            "..#..\n"
            "..#..\n"
            "....."
        )
        esperado = (
            ".....\n"
            ".....\n"
            ".###.\n"
            ".....\n"
            "....."
        )
        resultado = self.ejecutar(estado, 1)
        self.afirmar_grilla(resultado, esperado)

    def test_block_permanece_estable_durante_varias_generaciones(self):
        """Un bloque 2x2 permanece sin cambios durante varias generaciones."""
        estado = (
            ".......\n"
            "..##...\n"
            "..##...\n"
            ".......\n"
            ".......\n"
            ".......\n"
            "......."
        )
        resultado = self.ejecutar(estado, 10)
        self.afirmar_grilla(resultado, estado)

    def test_beehive_permanece_estable_durante_varias_generaciones(self):
        """Un beehive permanece sin cambios durante varias generaciones."""
        estado = (
            ".......\n"
            "..##...\n"
            ".#..#..\n"
            "..##...\n"
            ".......\n"
            ".......\n"
            "......."
        )
        resultado = self.ejecutar(estado, 7)
        self.afirmar_grilla(resultado, estado)

    def test_glider_se_desplaza_en_diagonal_despues_de_cuatro_generaciones(self):
        """Un glider se desplaza una celda en diagonal tras cuatro generaciones."""
        estado = (
            ".......\n"
            "..#....\n"
            "...#...\n"
            ".###...\n"
            ".......\n"
            ".......\n"
            "......."
        )
        esperado = (
            ".......\n"
            ".......\n"
            "...#...\n"
            "....#..\n"
            "..###..\n"
            ".......\n"
            "......."
        )
        resultado = self.ejecutar(estado, 4)
        self.afirmar_grilla(resultado, esperado)

    def test_nacimiento_con_exactamente_tres_vecinas_vivas(self):
        """Una célula muerta nace al tener exactamente tres vecinas vivas."""
        estado = (
            ".....\n"
            "..#..\n"
            ".#.#.\n"
            ".....\n"
            "....."
        )
        esperado = (
            ".....\n"
            "..#..\n"
            "..#..\n"
            ".....\n"
            "....."
        )
        resultado = self.ejecutar(estado, 1)
        self.afirmar_grilla(resultado, esperado)

    def test_muerte_por_soledad_de_una_celula_aislada(self):
        """Una célula viva aislada muere por soledad en la generación siguiente."""
        estado = (
            ".....\n"
            ".....\n"
            "..#..\n"
            ".....\n"
            "....."
        )
        esperado = (
            ".....\n"
            ".....\n"
            ".....\n"
            ".....\n"
            "....."
        )
        resultado = self.ejecutar(estado, 1)
        self.afirmar_grilla(resultado, esperado)

    def test_borde_sin_wraparound_no_reaparece_por_el_lado_opuesto(self):
        """El borde se trata como muerto y no hay continuidad por el lado opuesto."""
        estado = (
            "#....\n"
            "#....\n"
            "#....\n"
            ".....\n"
            "....."
        )
        esperado = (
            ".....\n"
            "##...\n"
            ".....\n"
            ".....\n"
            "....."
        )
        resultado = self.ejecutar(estado, 1)
        self.afirmar_grilla(resultado, esperado)

    def test_generacion_cero_conserva_el_estado_byte_a_byte(self):
        """Con cero generaciones la salida es idéntica al archivo de entrada."""
        estado = (
            ".#..#\n"
            ".....\n"
            "..##.\n"
            "#....\n"
        )
        resultado = self.ejecutar(estado, 0)
        self.assertEqual(
            resultado.returncode,
            0,
            msg=f"vida.py terminó con código {resultado.returncode}: "
            f"{resultado.stderr}",
        )
        self.assertEqual(resultado.stdout, estado)


if __name__ == "__main__":
    unittest.main()
