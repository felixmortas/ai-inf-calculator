#!/usr/bin/env python3
"""Ajuste des paramètres actifs des MoE et génération d'un graphique SVG."""

import csv
import argparse
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data/raw/moe_models_params.csv"
SVG_PATH = ROOT / "data/raw/moe_params_regression.svg"


def lire_donnees():
    with CSV_PATH.open(encoding="utf-8", newline="") as fichier:
        lignes = list(csv.DictReader(fichier))
    donnees = []
    for ligne in lignes:
        x, y = float(ligne["params"]), float(ligne["params_activated"])
        if not math.isfinite(x) or not math.isfinite(y) or x <= 0 or y < 0 or y > x:
            raise ValueError(f"Valeurs invalides pour {ligne['model']}: {x}, {y}")
        donnees.append({**ligne, "x": x, "y": y})
    if not donnees:
        raise ValueError(f"Aucune observation dans {CSV_PATH}")
    return donnees


def resoudre(matrice, vecteur):
    """Résout un petit système linéaire par élimination de Gauss."""
    n = len(vecteur)
    a = [list(map(float, matrice[i])) + [float(vecteur[i])] for i in range(n)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda ligne: abs(a[ligne][col]))
        if abs(a[pivot][col]) < 1e-12:
            raise ValueError("Régression singulière")
        a[col], a[pivot] = a[pivot], a[col]
        facteur = a[col][col]
        a[col] = [v / facteur for v in a[col]]
        for ligne in range(n):
            if ligne != col:
                facteur = a[ligne][col]
                a[ligne] = [a[ligne][j] - facteur * a[col][j] for j in range(n + 1)]
    return [a[i][-1] for i in range(n)]


def moindres_carres(vecteurs, y):
    largeur = len(vecteurs[0])
    matrice = [[sum(v[i] * v[j] for v in vecteurs) for j in range(largeur)] for i in range(largeur)]
    cible = [sum(v[i] * yi for v, yi in zip(vecteurs, y)) for i in range(largeur)]
    return resoudre(matrice, cible)


def ajuster_puissance(x, y):
    """Ajuste y = a*x**b par moindres carrés non linéaires sur l'échelle brute."""
    def evaluer(exposant):
        puissances = [v**exposant for v in x]
        echelle = sum(p * yi for p, yi in zip(puissances, y)) / sum(p * p for p in puissances)
        erreur = sum((echelle * p - yi) ** 2 for p, yi in zip(puissances, y))
        return erreur, echelle

    # Recherche grossière suivie d'un raffinement local déterministe.
    pas = 0.01
    candidats = [0.01 + i * pas for i in range(150)]
    exposant = min(candidats, key=lambda b: evaluer(b)[0])
    debut, fin = max(0.001, exposant - pas), exposant + pas
    for _ in range(24):
        gauche = debut + (fin - debut) / 3
        droite = fin - (fin - debut) / 3
        if evaluer(gauche)[0] < evaluer(droite)[0]:
            fin = droite
        else:
            debut = gauche
    exposant = (debut + fin) / 2
    _, echelle = evaluer(exposant)
    return echelle, exposant


def ajuster(modele, x, y):
    if modele == "linéaire":
        vecteurs = [[1, v] for v in x]
        b = moindres_carres(vecteurs, y)
        return lambda t: b[0] + b[1] * t, f"y = {b[0]:.4f} + {b[1]:.6f}x"
    if modele == "logarithmique":
        vecteurs = [[1, math.log(v)] for v in x]
        b = moindres_carres(vecteurs, y)
        return lambda t: b[0] + b[1] * math.log(t), f"y = {b[0]:.4f} + {b[1]:.4f} ln(x)"
    if modele == "quadratique":
        echelle = max(x)
        vecteurs = [[1, v / echelle, (v / echelle) ** 2] for v in x]
        b = moindres_carres(vecteurs, y)
        return lambda t: b[0] + b[1] * (t / echelle) + b[2] * (t / echelle) ** 2, f"y = {b[0]:.4f} + {b[1] / echelle:.6f}x {b[2] / echelle**2:+.9f}x²"
    a, b = ajuster_puissance(x, y)
    return lambda t: a * t**b, f"y = {a:.4f} x^{b:.4f}"


def rmse(observations, predict):
    return math.sqrt(sum((predict(x) - y) ** 2 for x, y in observations) / len(observations))


def valider_croisee(modele, x, y):
    erreurs = []
    for exclu in range(len(x)):
        x_train = x[:exclu] + x[exclu + 1 :]
        y_train = y[:exclu] + y[exclu + 1 :]
        predire, _ = ajuster(modele, x_train, y_train)
        erreurs.append((predire(x[exclu]) - y[exclu]) ** 2)
    return math.sqrt(sum(erreurs) / len(erreurs))


def predire_params_actives(params):
    """Prédit les paramètres actifs (milliards) pour un total donné (milliards)."""
    if not math.isfinite(params) or params <= 0:
        raise ValueError("Le nombre de paramètres totaux doit être positif et fini")
    donnees = lire_donnees()
    predire, _ = ajuster("puissance", [d["x"] for d in donnees], [d["y"] for d in donnees])
    return predire(params)


def creer_svg(donnees, predire, formule):
    largeur, hauteur = 1000, 620
    gauche, droite, haut, bas = 100, 950, 90, 520
    xmin, xmax = min(d["x"] for d in donnees), max(d["x"] for d in donnees)
    ymax = max(d["y"] for d in donnees) * 1.12
    lmin, lmax = math.log10(xmin), math.log10(xmax)

    def px(x):
        return gauche + (math.log10(x) - lmin) / (lmax - lmin) * (droite - gauche)

    def py(y):
        return bas - y / ymax * (bas - haut)

    couleurs = {"ikp": "#2674b8", "huggingface": "#e57c28"}
    elements = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{largeur}" height="{hauteur}" viewBox="0 0 {largeur} {hauteur}">',
        '<rect width="100%" height="100%" fill="white"/>',
        '<style>text{font-family:Arial,sans-serif;fill:#253244}.grille{stroke:#dce2e8;stroke-width:1}.courbe{fill:none;stroke:#192d46;stroke-width:3}</style>',
        '<text x="500" y="34" text-anchor="middle" font-size="22" font-weight="bold">Paramètres actifs des modèles MoE</text>',
        f'<text x="500" y="61" text-anchor="middle" font-size="14">Régression ajustée : {formule.replace("&", "&amp;").replace("<", "&lt;")}</text>',
    ]
    for valeur in range(0, int(ymax // 10) * 10 + 1, 10):
        ycoord = py(valeur)
        elements.extend([f'<line class="grille" x1="{gauche}" y1="{ycoord:.1f}" x2="{droite}" y2="{ycoord:.1f}"/>', f'<text x="{gauche-12}" y="{ycoord+5:.1f}" text-anchor="end" font-size="12">{valeur}</text>'])
    for puissance in range(math.floor(lmin), math.ceil(lmax) + 1):
        valeur = 10**puissance
        if xmin <= valeur <= xmax:
            xcoord = px(valeur)
            elements.extend([f'<line class="grille" x1="{xcoord:.1f}" y1="{haut}" x2="{xcoord:.1f}" y2="{bas}"/>', f'<text x="{xcoord:.1f}" y="{bas+22}" text-anchor="middle" font-size="12">{valeur:g}</text>'])
    points = []
    for i in range(161):
        x = 10 ** (lmin + (lmax - lmin) * i / 160)
        points.append(f'{px(x):.1f},{py(predire(x)):.1f}')
    elements.append(f'<polyline class="courbe" points="{" ".join(points)}"/>')
    for d in donnees:
        couleur = couleurs.get(d["source"], "#777777")
        elements.append(f'<circle cx="{px(d["x"]):.1f}" cy="{py(d["y"]):.1f}" r="5" fill="{couleur}" fill-opacity=".75"><title>{d["model"]}: {d["x"]:g}B totaux, {d["y"]:g}B actifs ({d["source"]})</title></circle>')
    etiquettes = sorted(donnees, key=lambda d: abs(predire(d["x"]) - d["y"]), reverse=True)[:4]
    for index, d in enumerate(etiquettes):
        decalage = -12 if index % 2 == 0 else 18
        nom = d["model"].replace("&", "&amp;").replace("<", "&lt;")
        elements.append(f'<text x="{px(d["x"])+8:.1f}" y="{py(d["y"])+decalage:.1f}" font-size="11">{nom}</text>')
    elements.extend([
        f'<line x1="{gauche}" y1="{bas}" x2="{droite}" y2="{bas}" stroke="#253244"/>',
        f'<line x1="{gauche}" y1="{haut}" x2="{gauche}" y2="{bas}" stroke="#253244"/>',
        f'<text x="{(gauche+droite)/2}" y="{bas+55}" text-anchor="middle" font-size="15">Paramètres totaux (milliards, échelle logarithmique)</text>',
        f'<text x="25" y="{(haut+bas)/2}" text-anchor="middle" font-size="15" transform="rotate(-90 25 {(haut+bas)/2})">Paramètres actifs (milliards)</text>',
    ])
    for index, source in enumerate(("ikp", "huggingface")):
        xx = 720 + index * 135
        elements.extend([f'<circle cx="{xx}" cy="{hauteur-24}" r="5" fill="{couleurs[source]}"/>', f'<text x="{xx+12}" y="{hauteur-19}" font-size="13">{source}</text>'])
    elements.append('</svg>')
    SVG_PATH.parent.mkdir(parents=True, exist_ok=True)
    SVG_PATH.write_text("\n".join(elements), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--params", type=float, help="prédire les paramètres actifs pour ce total (milliards)")
    arguments = parser.parse_args()
    donnees = lire_donnees()
    x = [d["x"] for d in donnees]
    y = [d["y"] for d in donnees]
    observations = list(zip(x, y))
    resultats = []
    for nom in ("linéaire", "logarithmique", "quadratique", "puissance"):
        predire, formule = ajuster(nom, x, y)
        resultats.append((valider_croisee(nom, x, y), nom, predire, formule))
    erreur, nom, predire, formule = min(resultats, key=lambda resultat: resultat[0])
    print(f"Observations : {len(donnees)}")
    print("RMSE leave-one-out (milliards de paramètres actifs) :")
    for cv, nom_modele, _, _ in sorted(resultats):
        print(f"  {nom_modele}: {cv:.3f}")
    print(f"Modèle retenu : {nom} — {formule}")
    print(f"RMSE ajustement : {rmse(observations, predire):.3f} milliards")
    print(f"RMSE leave-one-out : {erreur:.3f} milliards")
    if arguments.params is not None:
        print(f"Prédiction pour {arguments.params:g}B : {predire_params_actives(arguments.params):.3f}B paramètres actifs")
    creer_svg(donnees, predire, formule)
    print(f"Graphique : {SVG_PATH.relative_to(ROOT)}")
    print("Attention : la régression décrit une tendance empirique, pas une règle structurelle des architectures MoE.")


if __name__ == "__main__":
    main()
