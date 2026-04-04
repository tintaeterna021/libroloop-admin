import os
import re
import time
import unicodedata
from datetime import datetime
from typing import Dict, Any, List, Tuple

import requests
import pandas as pd

API_BASE = "https://www.googleapis.com/books/v1/volumes"
API_KEY = None  # Si quieres más cuota, pon tu API key aquí
INPUT_TXT = "isbns.txt"

# ---------------------------- Utilidades ----------------------------

def clean_isbn(raw: str) -> str:
    s = raw.strip().replace(" ", "").replace("-", "")
    s = s.upper()
    return "".join(ch for ch in s if ch.isdigit() or ch == "X")

def slugify_title(title: str) -> str:
    if not title:
        return "sin_titulo"
    norm = unicodedata.normalize("NFD", title)
    ascii_only = "".join(ch for ch in norm if unicodedata.category(ch) != "Mn")
    ascii_only = ascii_only.lower()
    ascii_only = re.sub(r"[^a-z0-9]+", "_", ascii_only)
    ascii_only = ascii_only.strip("_")
    ascii_only = re.sub(r"_+", "_", ascii_only)
    return ascii_only or "sin_titulo"

def map_language(lang_code: str) -> str:
    if not lang_code:
        return ""
    code = lang_code.lower()
    if code == "es":
        return "Español"
    if code == "en":
        return "Inglés"
    return lang_code

CATEGORY_MAP = {
    "fiction": "Ficción",
    "juvenile fiction": "Ficción juvenil",
    "self-help": "Autoayuda",
    "religion": "Religión",
    "health & fitness": "Salud y estado físico",
    "medical": "Medicina",
    "computers": "Computación",
    "technology & engineering": "Tecnología e ingeniería",
    "business & economics": "Negocios y economía",
    "education": "Educación",
    "history": "Historia",
    "art": "Arte",
    "science": "Ciencia",
    "mathematics": "Matemáticas",
    "philosophy": "Filosofía",
    "psychology": "Psicología",
    "social science": "Ciencias sociales",
    "biography & autobiography": "Biografía y autobiografía",
    "poetry": "Poesía",
    "drama": "Drama",
    "law": "Derecho",
    "music": "Música",
    "sports & recreation": "Deportes y recreación",
    "travel": "Viajes",
    "cooking": "Cocina",
    "study aids": "Ayudas de estudio",
    "foreign language study": "Estudio de idiomas",
}

def translate_category(cat: str) -> str:
    if not cat:
        return ""
    key = cat.strip().lower()
    translated = CATEGORY_MAP.get(key, cat)
    s = translated.lower()
    return s[:1].upper() + s[1:] if s else ""

def categories_to_str(cats: List[str]) -> str:
    if not cats:
        return ""
    translated = [translate_category(c) for c in cats]
    return " / ".join(translated)

def description_html(vi: Dict[str, Any], lang_label: str) -> Tuple[str, List[str]]:
    missing = []
    authors = ", ".join(vi.get("authors", [])) if vi.get("authors") else ""
    if not authors:
        missing.append("Autor(es)")
    publisher = vi.get("publisher") or ""
    if not publisher:
        missing.append("Editorial")
    pub_date = vi.get("publishedDate") or ""
    if not pub_date:
        missing.append("Fecha de publicación")
    page_count = vi.get("pageCount")
    if isinstance(page_count, int) and page_count >= 1:
        pages = str(page_count)
    else:
        pages = ""
        missing.append("Número de páginas")
    ids = {x.get("type",""): x.get("identifier","") for x in vi.get("industryIdentifiers", [])}
    isbn10 = ids.get("ISBN_10", "")
    isbn13 = ids.get("ISBN_13", "")
    html = f"""<ul>
<li>Autor(es) : {authors}</li>
<li>Editorial : {publisher}</li>
<li>Fecha de publicación : {pub_date}</li>
<li>Idioma : {lang_label}</li>
<li>Número de páginas : {pages}</li>
<li>ISBN-10 : {isbn10}</li>
<li>IBN-13 : {isbn13}</li>
</ul>"""
    if not isbn10:
        missing.append("ISBN-10")
    if not isbn13:
        missing.append("ISBN-13")
    return html, missing

def pick_short_description(item: Dict[str, Any]) -> str:
    vi = item.get("volumeInfo", {}) or {}
    si = item.get("searchInfo", {}) or {}

    description = vi.get("description")
    snippet = si.get("textSnippet")
    subtitle = vi.get("subtitle")

    def word_count(text: str) -> int:
        return len(text.split()) if text else 0

    target = 160

    # Caso 1: tenemos ambos
    if description and snippet:
        desc_len = word_count(description)
        snip_len = word_count(snippet)

        # Calcula qué tan lejos está cada uno de 160
        diff_desc = abs(desc_len - target)
        diff_snip = abs(snip_len - target)

        if diff_desc <= diff_snip:
            return description
        else:
            return snippet

    # Caso 2: solo hay uno
    if description:
        return description
    if snippet:
        return snippet

    # Caso 3: fallback al subtitle
    if subtitle:
        return subtitle

    return ""


def google_books_query_isbn(isbn: str, session: requests.Session) -> Tuple[int, Dict[str, Any]]:
    params = {"q": f"isbn:{isbn}", "projection": "full"}
    if API_KEY:
        params["key"] = API_KEY
    r = session.get(API_BASE, params=params, timeout=20)
    r.raise_for_status()
    data = r.json()
    if data.get("totalItems", 0) !=0:
        if len(data.get("items")) > 0 and data.get("items"):
            if len(data.get("items")) > 1:
                return len(data.get("items")), {}
            else:
                return 1, data["items"][0]
        return 0, {}
    return 0, {}

# ---------------------------- Proceso principal ----------------------------

def process_isbns(isbns: List[str]) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    session = requests.Session()
    ok_rows = []
    err_rows = []
    img_rows = []

    now = datetime.now()
    year = now.year
    month = now.month

    for raw in isbns:
        isbn = clean_isbn(raw)
        if not isbn:
            err_rows.append({"ISBN": raw, "ERROR": "ISBN vacío o inválido"})
            continue

        try:
            count, item = google_books_query_isbn(isbn, session)
        except Exception as e:
            err_rows.append({"ISBN": isbn, "ERROR": str(e)})
            continue

        if count == 0:
            err_rows.append({"ISBN": isbn, "ERROR": "NO SE ENCONTRÓ"})
            continue

        if count > 1:
            err_rows.append({"ISBN": isbn, "ERROR": f"SE ENCONTRARON {count} COINCIDENCIAS"})
            continue

        vi = item.get("volumeInfo", {}) or {}
        title = (vi.get("title") or "").upper()
        if not title:
            err_rows.append({"ISBN": isbn, "ERROR": "Falta Título"})
        language_label = map_language(vi.get("language") or "")
        html_ul, missing_fields = description_html(vi, language_label)
        for miss in missing_fields:
            err_rows.append({"ISBN": isbn, "ERROR": f"Falta {miss}"})
        short_desc = pick_short_description(item)
        if not short_desc:
            err_rows.append({"ISBN": isbn, "ERROR": "Falta Descripción corta"})
        categorias_google = vi.get("categories") or []
        categorias_traducidas = []
        categorias_str = ""

        if categorias_google:
            for c in categorias_google:
                key = c.strip().lower()
                if key in CATEGORY_MAP:
                    categorias_traducidas.append(CATEGORY_MAP[key])
                else:
                    # usar la categoría tal cual la devuelve Google
                    categorias_traducidas.append(c)
                    # registrar error porque no estaba en el diccionario
                    err_rows.append({"ISBN": isbn, "ERROR": f"Categoría no traducida: {c}"})
            # armar el string final, formateado "Primera mayúscula, resto minúscula"
            categorias_str = ",".join(
                [cat[:1].upper() + cat[1:].lower() for cat in categorias_traducidas]
            )
        else:
            # no había categorías en la API
            err_rows.append({"ISBN": isbn, "ERROR": "Falta Categorías"})
        slug = slugify_title(vi.get("title") or "")
        base = f"https://tintaeterna.com/wp-content/uploads/{year}/{month:02d}/"
        portada = f"{slug}_portada.jpg"
        contraportada = f"{slug}_contraportada.jpg"
        original = f"{slug}_original.jpg"
        imagenes = f"{base}{portada},{base}{contraportada},{base}{original}"

        ok_rows.append({
            "ID": isbn,
            "Tipo": "simple",
            "SKU": isbn,
            "GTIN, UPC, EAN o ISBN": isbn,
            "Nombre": title,
            "Publicado": 1,
            "Descripción": html_ul,
            "Descripción corta": short_desc,
            "¿Existencias?": 1,
            "Inventario": 1,
            "¿Permitir valoraciones de clientes?": 0,
            "Precio normal": "",
            "Categorías": categorias_str,
            "Imágenes": imagenes,
            "Nombre del atributo 1": "Tapa",
            "Valor(es) del atributo 1": "blanda",
            "Atributo visible": 1,
            "Atributo global": 1,
        })

        img_rows.append({
            "ISBN": isbn,
            "Nombre": title,
            "Portada": portada,
            "Contraportada": contraportada,
            "Original": original,
            "Prueba": f'=HYPERLINK("https://www.amazon.com.mx/s?k={isbn}&__mk_es_MX=%C3%85M%C3%85%C5%BD%C3%95%C3%91&ref=nb_sb_noss", "Ver Amazon")'
            
        })
        time.sleep(0.15)

    return pd.DataFrame(ok_rows), pd.DataFrame(err_rows), pd.DataFrame(img_rows)

def main():
    if not os.path.exists(INPUT_TXT):
        print(f"No existe {INPUT_TXT}")
        return
    with open(INPUT_TXT, "r", encoding="utf-8") as f:
        isbns = [line.strip() for line in f if line.strip()]
    df_ok, df_err, df_imgs = process_isbns(isbns)
    today = datetime.now().strftime("%d-%m-%y")
    out_ok = f"{today}_INSERCION.xlsx"
    out_err = f"{today}_ERRORES.xlsx"
    out_imgs  = f"{today}_IMAGENES.xlsx"
    if not df_ok.empty:
        df_ok.to_excel(out_ok, index=False)
        print(f"Exportado: {out_ok}")
    if not df_err.empty:
        df_err.to_excel(out_err, index=False)
        print(f"Exportado: {out_err}")
    if not df_imgs.empty:
        df_imgs.to_excel(out_imgs, index=False)
        print(f"Exportado: {out_imgs}")

if __name__ == "__main__":
    main()
