#!/usr/bin/env python3
"""Génère un nuage de points SVG des paramètres totaux et actifs prédits."""

import argparse
import csv
import colorsys
import html
import math
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV = ROOT / "data/raw/ikp_closedModels_params_with_active_predictions.csv"
DEFAULT_SVG = ROOT / "data/raw/ikp_closedModels_params_predictions.svg"
FIT_CSV = ROOT / "data/raw/moe_models_params.csv"
PALETTE = [
    "#2563eb", "#e11d48", "#059669", "#d97706", "#7c3aed", "#0891b2",
    "#4f46e5", "#65a30d", "#db2777", "#475569",
]


def lire_donnees(path):
    with path.open(encoding="utf-8", newline="") as fichier:
        lignes = list(csv.DictReader(fichier))
    champs = {"model", "vendor", "estimated_params_billions", "predicted_active_params_billions"}
    if not lignes or not champs.issubset(lignes[0]):
        raise ValueError(f"CSV vide ou colonnes manquantes : {path}")
    for ligne in lignes:
        ligne["total"] = float(ligne["estimated_params_billions"])
        ligne["actifs"] = float(ligne["predicted_active_params_billions"])
        if not math.isfinite(ligne["total"]) or ligne["total"] <= 0:
            raise ValueError(f"Nombre total invalide pour {ligne['model']}")
        if not math.isfinite(ligne["actifs"]) or ligne["actifs"] < 0:
            raise ValueError(f"Nombre actif invalide pour {ligne['model']}")
    return lignes


def lire_plage_ajustement(path):
    with path.open(encoding="utf-8", newline="") as fichier:
        valeurs = [float(ligne["params"]) for ligne in csv.DictReader(fichier)]
    if not valeurs or any(not math.isfinite(valeur) or valeur <= 0 for valeur in valeurs):
        raise ValueError(f"Valeurs d'ajustement absentes ou invalides dans {path}")
    return min(valeurs), max(valeurs)


def creer_svg(lignes, sortie, plage_ajustement):
    largeur, hauteur = 1280, 820
    gauche, droite, haut, bas = 105, 1225, 125, 700
    xmin = max(1, min(ligne["total"] for ligne in lignes) * 0.8)
    xmax = max(ligne["total"] for ligne in lignes) * 1.1
    ymin = 0
    ymax = max(20, math.ceil(max(ligne["actifs"] for ligne in lignes) / 20) * 20)
    x_pixel = lambda x: gauche + (math.log10(x) - math.log10(xmin)) / (math.log10(xmax) - math.log10(xmin)) * (droite - gauche)
    y_pixel = lambda y: bas - (y - ymin) / (ymax - ymin) * (bas - haut)

    comptes = Counter(ligne["vendor"] for ligne in lignes)
    fournisseurs = [nom for nom, _ in comptes.most_common()]
    couleurs = {}
    for index, nom in enumerate(fournisseurs):
        if index < len(PALETTE):
            couleurs[nom] = PALETTE[index]
        else:
            rouge, vert, bleu = colorsys.hsv_to_rgb((index * 0.61803398875) % 1, 0.62, 0.72)
            couleurs[nom] = f"#{round(rouge*255):02x}{round(vert*255):02x}{round(bleu*255):02x}"
    elements = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{largeur}" height="{hauteur}" viewBox="0 0 {largeur} {hauteur}">',
        '<rect width="100%" height="100%" fill="#fff"/>',
        '<style>text{font-family:Inter,Arial,sans-serif;fill:#172033}.muted{fill:#64748b}.grid{stroke:#e2e8f0;stroke-width:1}.axis{stroke:#64748b;stroke-width:1.4}.dot{stroke:#fff;stroke-width:1.4;opacity:.82}</style>',
        '<text x="105" y="48" font-size="27" font-weight="700">Paramètres actifs prédits des modèles fermés</text>',
        f'<text x="105" y="78" font-size="15" class="muted">{len(lignes)} modèles · estimation basée sur leur nombre total de paramètres</text>',
        '<rect x="105" y="95" width="1120" height="38" rx="7" fill="#fff7ed" stroke="#fed7aa"/>',
        f'<text x="120" y="119" font-size="13" fill="#9a3412">Ajustement MoE sur {plage_ajustement[0]:g}–{plage_ajustement[1]:g} Md ; les points hors plage sont extrapolés.</text>',
    ]

    for valeur in range(0, ymax + 1, 20):
        y = y_pixel(valeur)
        elements.extend([
            f'<line class="grid" x1="{gauche}" y1="{y:.1f}" x2="{droite}" y2="{y:.1f}"/>',
            f'<text x="{gauche-13}" y="{y+5:.1f}" font-size="13" text-anchor="end" class="muted">{valeur}</text>',
        ])
    graduations_x = []
    for puissance in range(math.floor(math.log10(xmin)), math.ceil(math.log10(xmax)) + 1):
        base = 10**puissance
        graduations_x.extend((base, 3 * base))
    for valeur in sorted(set(graduations_x)):
        if not xmin <= valeur <= xmax:
            continue
        x = x_pixel(valeur)
        elements.extend([
            f'<line class="grid" x1="{x:.1f}" y1="{haut}" x2="{x:.1f}" y2="{bas}"/>',
            f'<text x="{x:.1f}" y="{bas+24}" font-size="13" text-anchor="middle" class="muted">{valeur:,}</text>',
        ])
    elements.extend([
        f'<line class="axis" x1="{gauche}" y1="{bas}" x2="{droite}" y2="{bas}"/>',
        f'<line class="axis" x1="{gauche}" y1="{haut}" x2="{gauche}" y2="{bas}"/>',
        f'<text x="{(gauche+droite)/2}" y="{bas+57}" text-anchor="middle" font-size="15">Paramètres totaux estimés (milliards, échelle logarithmique)</text>',
        f'<text x="28" y="{(haut+bas)/2}" text-anchor="middle" font-size="15" transform="rotate(-90 28 {(haut+bas)/2})">Paramètres actifs prédits (milliards)</text>',
    ])

    for ligne in lignes:
        nom = html.escape(ligne["model"], quote=True)
        fournisseur = html.escape(ligne["vendor"], quote=True)
        total, actifs = ligne["total"], ligne["actifs"]
        info = f"{nom} ({fournisseur}) — total estimé : {total:g} Md; actifs prédits : {actifs:.2f} Md"
        elements.append(
            f'<circle class="dot" cx="{x_pixel(total):.2f}" cy="{y_pixel(actifs):.2f}" '
            f'r="6" fill="{couleurs[ligne["vendor"]]}"><title>{info}</title></circle>'
        )

    for index, fournisseur in enumerate(fournisseurs):
        colonne, rangee = index % 6, index // 6
        x, y = 105 + colonne * 187, 762 + rangee * 22
        label = html.escape(fournisseur)
        elements.extend([
            f'<circle cx="{x}" cy="{y-4}" r="5" fill="{couleurs[fournisseur]}"/>',
            f'<text x="{x+11}" y="{y}" font-size="12">{label} ({comptes[fournisseur]})</text>',
        ])
    elements.append("</svg>")
    sortie.parent.mkdir(parents=True, exist_ok=True)
    sortie.write_text("\n".join(elements), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV, help="CSV de paramètres avec prédictions")
    parser.add_argument("--fit-csv", type=Path, default=FIT_CSV, help="CSV MoE utilisé pour ajuster la régression")
    parser.add_argument("--output", type=Path, default=DEFAULT_SVG, help="chemin du SVG généré")
    args = parser.parse_args()
    lignes = lire_donnees(args.csv)
    plage_ajustement = lire_plage_ajustement(args.fit_csv)
    creer_svg(lignes, args.output, plage_ajustement)
    print(f"Visualisation créée : {args.output} ({len(lignes)} modèles)")


if __name__ == "__main__":
    main()
