"""Independent arithmetic and schema checks for the proposed slice golden fixtures.

This is NOT a production calculator implementation. These expected numbers are
handwritten acceptance fixtures for a future TypeScript implementation.
"""
from collections import OrderedDict
from decimal import Decimal, ROUND_CEILING
from pathlib import Path
import json
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "docs/specs/plot-zones-materials-cases.json"
NUMBER = re.compile(r"-?\d+(?:[.,]\d+)?\Z")
MATERIALS = {"soil", "sand", "gravel"}


class InputNumberError(ValueError):
    pass


def parse_number(value, *, min_exclusive=None, min_inclusive=None,
                 max_inclusive=None):
    if value is None or not isinstance(value, str) or not value.strip():
        raise InputNumberError("required")
    value = value.strip()
    if not NUMBER.fullmatch(value):
        raise InputNumberError("invalid_number")
    number = Decimal(value.replace(",", "."))
    if min_exclusive is not None and number <= Decimal(str(min_exclusive)):
        raise InputNumberError("out_of_range")
    if min_inclusive is not None and number < Decimal(str(min_inclusive)):
        raise InputNumberError("out_of_range")
    if max_inclusive is not None and number > Decimal(str(max_inclusive)):
        raise InputNumberError("out_of_range")
    return number


def positive_length(value):
    return parse_number(value, min_exclusive=0, max_inclusive=100000)


def _no_duplicate_keys(pairs):
    obj = {}
    for key, value in pairs:
        if key in obj:
            raise ValueError(f"duplicate JSON key: {key}")
        obj[key] = value
    return obj


def read_fixtures(path=FIXTURES):
    body = path.read_text(encoding="utf-8", errors="strict")
    if "\ufffd" in body:
        raise ValueError("Unicode replacement character U+FFFD")
    return json.loads(body, object_pairs_hook=_no_duplicate_keys)


def reference_case(case):
    """Use decimal dimensional arithmetic, independently of future app code."""
    plot = case["plot"]
    plot_area = positive_length(plot["length_m"]) * positive_length(plot["width_m"])
    zone_areas = Decimal(0)
    groups = OrderedDict()
    used_ids = set()

    for zone in case["zones"]:
        if zone["id"] in used_ids:
            raise ValueError("duplicate_zone_id")
        used_ids.add(zone["id"])
        area = positive_length(zone["length_m"]) * positive_length(zone["width_m"])
        zone_areas += area
        for layer in zone["layers"]:
            material = layer["material"]
            if material not in MATERIALS:
                raise ValueError("invalid_material")
            thick_cm = parse_number(
                layer["thickness_cm"], min_exclusive=0, max_inclusive=1000
            )
            reserve = parse_number(
                layer["reserve_percent"], min_inclusive=0, max_inclusive=100
            )
            package = (
                None if layer["package_l"] is None else
                parse_number(layer["package_l"], min_exclusive=0, max_inclusive=10**9)
            )
            density = (
                None if layer["density_kg_m3"] is None else
                parse_number(
                    layer["density_kg_m3"], min_exclusive=0, max_inclusive=100000
                )
            )
            net_l = area * thick_cm / Decimal(100) * Decimal(1000)
            purchase_l = net_l * (Decimal(1) + reserve / Decimal(100))
            key = (material, package, density)
            if key not in groups:
                groups[key] = {"net_l": Decimal(0), "purchase_l": Decimal(0)}
            groups[key]["net_l"] += net_l
            groups[key]["purchase_l"] += purchase_l

    bom = []
    for (material, package, density), volumes in groups.items():
        purchase_l = volumes["purchase_l"]
        packages = (
            None if package is None else
            int((purchase_l / package).to_integral_value(rounding=ROUND_CEILING))
        )
        mass_kg = (
            None if density is None else
            purchase_l / Decimal(1000) * density
        )
        bom.append({
            "material": material,
            "package_l": package,
            "density_kg_m3": density,
            "net_l": volumes["net_l"],
            "purchase_l": purchase_l,
            "packages": packages,
            "mass_kg": mass_kg,
        })

    return {
        "plot_area_m2": plot_area,
        "zones_area_sum_m2": zone_areas,
        "areas_exceed_plot": zone_areas > plot_area,
        "bom": bom,
    }


class PlotZonesMaterialsSpecTests(unittest.TestCase):
    def test_reference_values_are_independently_consistent(self):
        data = read_fixtures()
        self.assertEqual(data["schema_version"], "draft-0.1")
        self.assertEqual(len(data["valid_cases"]), 12)
        for case in data["valid_cases"]:
            with self.subTest(case=case["id"]):
                actual = reference_case(case)
                expected = case["expected"]
                self.assertEqual(actual["plot_area_m2"], Decimal(expected["plot_area_m2"]))
                self.assertEqual(actual["zones_area_sum_m2"],
                                 Decimal(expected["zones_area_sum_m2"]))
                self.assertIs(actual["areas_exceed_plot"], expected["areas_exceed_plot"])
                self.assertEqual(len(actual["bom"]), len(expected["bom"]))
                for got, want in zip(actual["bom"], expected["bom"]):
                    self.assertEqual(got["material"], want["material"])
                    self.assertEqual(
                        got["package_l"], None if want["package_l"] is None
                        else Decimal(want["package_l"])
                    )
                    self.assertEqual(
                        got["density_kg_m3"], None if want["density_kg_m3"] is None
                        else Decimal(want["density_kg_m3"])
                    )
                    self.assertEqual(got["net_l"], Decimal(want["net_l"]))
                    self.assertEqual(got["purchase_l"], Decimal(want["purchase_l"]))
                    self.assertEqual(got["packages"], want["packages"])
                    self.assertEqual(
                        got["mass_kg"], None if want["mass_kg"] is None
                        else Decimal(want["mass_kg"])
                    )

    def test_invalid_numeric_inputs_are_rejected(self):
        cases = read_fixtures()["invalid_number_cases"]
        self.assertEqual(len(cases), 12)
        for case in cases:
            with self.subTest(input=case["input"]):
                with self.assertRaises(InputNumberError) as caught:
                    parse_number(case["input"], **case.get("constraints", {}))
                self.assertEqual(str(caught.exception), case["expected_error"])

    def test_zone_order_is_immaterial_to_totals(self):
        for case in read_fixtures()["valid_cases"]:
            with self.subTest(case=case["id"]):
                original = reference_case(case)
                swapped = {
                    "plot": case["plot"],
                    "zones": list(reversed(case["zones"]))
                }
                reordered = reference_case(swapped)
                self.assertEqual(original["plot_area_m2"], reordered["plot_area_m2"])
                self.assertEqual(original["zones_area_sum_m2"],
                                 reordered["zones_area_sum_m2"])
                by_key = lambda result: {
                    (x["material"], x["package_l"], x["density_kg_m3"]):
                    (x["net_l"], x["purchase_l"], x["packages"], x["mass_kg"])
                    for x in result["bom"]
                }
                self.assertEqual(by_key(original), by_key(reordered))

    def test_reject_duplicate_json_keys(self):
        with self.assertRaisesRegex(ValueError, "duplicate JSON key"):
            json.loads('{"a": 1, "a": 2}', object_pairs_hook=_no_duplicate_keys)

    def test_reject_broken_unicode_document(self):
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            bad = Path(d) / "bad.json"
            bad.write_text('{"broken": "' + chr(0xFFFD) + '"}', encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "U\\+FFFD"):
                read_fixtures(bad)

    def test_tenths_are_not_inflated_by_float_rounding(self):
        case = next(c for c in read_fixtures()["valid_cases"]
                    if c["id"] == "decimal-tenths-exact-group")
        result = reference_case(case)
        self.assertEqual(result["bom"][0]["purchase_l"], Decimal("0.3"))
        self.assertEqual(result["bom"][0]["packages"], 1)

    def test_purchase_rounding_example(self):
        case = next(c for c in read_fixtures()["valid_cases"]
                    if c["id"] == "group-before-ceil")
        result = reference_case(case)
        self.assertEqual(result["bom"][0]["purchase_l"], Decimal("120"))
        self.assertEqual(result["bom"][0]["packages"], 3)
        # A per-zone ceiling would incorrectly add up to 4 bags.
        self.assertEqual(
            sum((Decimal("60") / Decimal("50")).to_integral_value(
                rounding=ROUND_CEILING) for _ in range(2)), 4
        )


if __name__ == "__main__":
    unittest.main()
