"""Read the source XLSX without modifying it; export (--write) or validate JSON.

Requires Python 3.10+ standard library only. Paths are relative to this script,
so validation also works when launched outside the application directory.
"""

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import posixpath
import sys
import xml.etree.ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / "project_sources" / "SELF_LAYERS_108문항_검사로직_FINAL_v1.0.xlsx"
DATA = ROOT / "src" / "data"
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
AREAS = {"CORE": 36, "RELATIONSHIP": 8, "PATTERN": 32, "DIRECTION": 32}
QUESTION_FIELDS = {
    "id", "displayOrder", "area", "dimensionCode", "dimensionName",
    "role", "text", "reverse", "weight",
}
DIMENSION_FIELDS = {"area", "code", "name", "definition", "boundary"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_workbook():
    sheets = {}
    with ZipFile(SOURCE, "r") as archive:
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = [
                "".join(node.itertext())
                for node in ET.fromstring(archive.read("xl/sharedStrings.xml"))
            ]
        relationships = {
            node.attrib["Id"]: node.attrib["Target"]
            for node in ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        }
        book = ET.fromstring(archive.read("xl/workbook.xml"))
        for sheet in book.findall("s:sheets/s:sheet", NS):
            target = relationships[sheet.attrib[f"{{{REL_NS}}}id"]]
            path = target.lstrip("/") if target.startswith("/") else posixpath.normpath("xl/" + target)
            document = ET.fromstring(archive.read(path))
            rows = []
            for row in document.findall("s:sheetData/s:row", NS):
                cells = {}
                for cell in row.findall("s:c", NS):
                    require(cell.find("s:f", NS) is None, "Unexpected formula in source workbook")
                    column = "".join(c for c in cell.attrib["r"] if c.isalpha())
                    kind = cell.get("t")
                    value = cell.findtext("s:v", default="", namespaces=NS)
                    if kind == "s":
                        value = strings[int(value)]
                    elif kind == "inlineStr":
                        value = "".join(cell.find("s:is", NS).itertext())
                    cells[column] = value
                if any(cells.values()):
                    rows.append(cells)
            sheets[sheet.attrib["name"]] = rows
    return sheets


def unique_index(rows, column, label):
    index = {}
    for row in rows:
        key = row[column]
        require(key and key not in index, f"Duplicate or empty {label}: {key}")
        index[key] = row
    return index


def source_data():
    sheets = read_workbook()
    headers = {
        "재설계 문항": ["문항 ID", "영역", "차원 코드", "차원명", "문항 역할", "기존 문항", "최종 문항", "역채점", "상태"],
        "서비스 노출순서": ["노출순서", "문항 ID", "영역", "차원 코드", "문항", "역채점", "응답척도"],
        "차원 설계": ["영역", "차원 코드", "차원명", "측정 정의", "인접 차원과의 경계"],
    }
    for name, expected in headers.items():
        require([sheets[name][0].get(chr(65 + i)) for i in range(len(expected))] == expected,
                f"Unexpected source columns: {name}")
    bank = unique_index(sheets["재설계 문항"][1:], "A", "question ID")
    order = unique_index(sheets["서비스 노출순서"][1:], "B", "display question ID")
    require(set(bank) == set(order), "Question IDs differ between source sheets")
    require(any("현재 모든 문항 가중치 1.0" in row.get("D", "") for row in sheets["채점 로직"]),
            "Source weight policy changed; review before export")
    questions = []
    for question_id, row in bank.items():
        display = order[question_id]
        require(row["H"] in ("Y", "N"), f"Invalid reverse marker: {question_id}")
        require((row["B"], row["C"], row["G"], row["H"]) ==
                (display["C"], display["D"], display["E"], display["F"]),
                f"Source sheets disagree: {question_id}")
        require(display["G"] == "1~5", f"Unexpected response scale: {question_id}")
        questions.append({
            "id": question_id,
            "displayOrder": int(display["A"]),
            "area": row["B"],
            "dimensionCode": row["C"],
            "dimensionName": row["D"],
            "role": row["E"],
            "text": row["G"],
            "reverse": row["H"] == "Y",
            "weight": 1.0,
        })
    questions.sort(key=lambda item: item["displayOrder"])
    dimensions = [{
        "area": row["A"], "code": row["B"], "name": row["C"],
        "definition": row["D"], "boundary": row["E"],
    } for row in sheets["차원 설계"][1:]]
    return questions, dimensions


def validate_structure(questions, dimensions):
    require(isinstance(questions, list) and len(questions) == 108, "Expected exactly 108 questions")
    require(isinstance(dimensions, list) and len(dimensions) == 27, "Expected exactly 27 dimensions")
    for dimension in dimensions:
        require(isinstance(dimension, dict) and set(dimension) == DIMENSION_FIELDS, "Invalid dimension fields")
        require(all(isinstance(v, str) and v.strip() for v in dimension.values()), "Empty dimension text")
        require(dimension["area"] in AREAS, "Invalid dimension area")
    lookup = unique_index(dimensions, "code", "dimension code")
    for question in questions:
        require(isinstance(question, dict) and set(question) == QUESTION_FIELDS, "Invalid question fields")
        for field in ("id", "area", "dimensionCode", "dimensionName", "role", "text"):
            require(isinstance(question[field], str) and question[field].strip(), f"Invalid {field}")
        require(type(question["displayOrder"]) is int, "displayOrder must be an integer")
        require(type(question["reverse"]) is bool, "reverse must be a boolean")
        require(type(question["weight"]) in (int, float) and question["weight"] == 1.0, "weight must be 1.0")
        dimension = lookup.get(question["dimensionCode"])
        require(dimension is not None, f"Unknown dimension: {question['id']}")
        require((question["area"], question["dimensionName"]) == (dimension["area"], dimension["name"]),
                f"Dimension metadata mismatch: {question['id']}")
    unique_index(questions, "id", "question ID")
    require([q["displayOrder"] for q in questions] == list(range(1, 109)), "Expected displayOrder 1..108 in order")
    require(Counter(q["dimensionCode"] for q in questions) == Counter({code: 4 for code in lookup}),
            "Each dimension must contain exactly 4 questions")
    require(Counter(q["area"] for q in questions) == Counter(AREAS), "Unexpected area counts")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Regenerate JSON, then validate it")
    args = parser.parse_args()
    before = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    expected_questions, expected_dimensions = source_data()
    validate_structure(expected_questions, expected_dimensions)
    if args.write:
        DATA.mkdir(parents=True, exist_ok=True)
        for name, payload in (("questions", expected_questions), ("dimensions", expected_dimensions)):
            (DATA / f"{name}.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    questions = json.loads((DATA / "questions.json").read_text(encoding="utf-8"))
    dimensions = json.loads((DATA / "dimensions.json").read_text(encoding="utf-8"))
    validate_structure(questions, dimensions)
    require(questions == expected_questions, "questions.json differs from source workbook")
    require(dimensions == expected_dimensions, "dimensions.json differs from source workbook")
    require(hashlib.sha256(SOURCE.read_bytes()).hexdigest() == before, "Source workbook changed during validation")
    print("PASS: 108 unique questions; displayOrder 1..108; 27 dimensions x 4 questions")
    print("PASS: all JSON fields match the source workbook; weights = 1.0")
    print(f"PASS: reverse markers preserved ({sum(q['reverse'] for q in questions)} Y)")
    print(f"PASS: source SHA256 unchanged: {before}")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, KeyError, OSError, ET.ParseError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        sys.exit(1)
