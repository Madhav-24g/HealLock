import json
import httpx

from app.config import settings

INTERACTIONS = {
    ("warfarin", "ibuprofen"): (
        "high",
        "drug_interaction",
        "Warfarin and NSAIDs (ibuprofen) together significantly increase gastrointestinal bleeding risk. Consider alternative analgesia like acetaminophen.",
    ),
    ("warfarin", "aspirin"): (
        "high",
        "drug_interaction",
        "Combined anticoagulant and antiplatelet therapy elevates major bleeding risk. Ensure indication is documented.",
    ),
    ("metformin", "contrast"): (
        "medium",
        "contraindication",
        "Metformin should be withheld before iodinated contrast procedures to prevent contrast-induced nephropathy & lactic acidosis.",
    ),
    ("lisinopril", "potassium"): (
        "medium",
        "drug_interaction",
        "ACE inhibitors combined with potassium supplements can cause severe hyperkalemia. Monitor serum potassium levels.",
    ),
    ("clopidogrel", "omeprazole"): (
        "medium",
        "drug_interaction",
        "Omeprazole inhibits CYP2C19, reducing the activation and efficacy of clopidogrel. Consider pantoprazole instead.",
    ),
    ("simvastatin", "amlodipine"): (
        "medium",
        "drug_interaction",
        "Amlodipine increases simvastatin exposure. Limit simvastatin dosage to 20mg daily to avoid rhabdomyolysis.",
    ),
    ("spironolactone", "lisinopril"): (
        "high",
        "drug_interaction",
        "Dual blockade of the renin-angiotensin-aldosterone system significantly increases risk of hyperkalemia and renal failure.",
    ),
}

DUPLICATES = {
    "atorvastatin": ["simvastatin", "rosuvastatin", "pravastatin", "lovastatin"],
    "lisinopril": ["enalapril", "ramipril", "benazepril", "captopril"],
    "ibuprofen": ["naproxen", "ketorolac", "diclofenac", "meloxicam", "celecoxib"],
    "metoprolol": ["atenolol", "bisoprolol", "carvedilol", "propranolol"],
    "amlodipine": ["nifedipine", "felodipine", "diltiazem"],
}

ALLERGY_FAMILIES = {
    "penicillin": ["amoxicillin", "ampicillin", "piperacillin", "augmentin", "penicillin v"],
    "sulfa": ["bactrim", "sulfamethoxazole", "sulfasalazine"],
    "aspirin": ["ibuprofen", "naproxen", "aspirin", "ketorolac"],
}


def check_prescription(meds: list[str], allergies: list[str], existing: list[str]) -> list[dict]:
    """Rules-based prescription safety checker with interaction, allergy, & duplicate detection."""
    flags: list[dict] = []
    lowered = [m.strip().lower() for m in meds]
    allergy_set = {a.strip().lower() for a in allergies}
    existing_l = [e.strip().lower() for e in existing]

    # Allergy Conflict Check
    for med in lowered:
        for allergy in allergy_set:
            if not allergy:
                continue
            if allergy in med:
                flags.append(
                    {
                        "conflict_type": "allergy_conflict",
                        "severity": "high",
                        "explanation": f"Patient allergy list includes '{allergy}', which conflicts directly with '{med}'. Review clinically before ordering.",
                    }
                )
            for family, members in ALLERGY_FAMILIES.items():
                if allergy in family or any(m in allergy for m in members):
                    if any(m in med for m in members):
                        flags.append(
                            {
                                "conflict_type": "allergy_conflict",
                                "severity": "high",
                                "explanation": f"Patient allergic to '{allergy}' ({family} family); prescribed '{med}' belongs to the same drug family.",
                            }
                        )

    # Interaction & Duplicate Checks
    all_combined = lowered + existing_l
    for i, a in enumerate(lowered):
        for b in all_combined[i + 1 :]:
            if not a or not b or a == b:
                if a == b and a:
                    flags.append(
                        {
                            "conflict_type": "duplicate_medication",
                            "severity": "medium",
                            "explanation": f"'{a}' appears more than once in current or existing active prescriptions.",
                        }
                    )
                continue

            # Drug-Drug Interaction Check
            key_set = {a, b}
            for pair, (sev, ctype, expl) in INTERACTIONS.items():
                if set(pair) == key_set:
                    flags.append({"conflict_type": ctype, "severity": sev, "explanation": expl})

            # Therapeutic Class Duplicate Check
            for stem, cousins in DUPLICATES.items():
                family = {stem, *cousins}
                if a in family and b in family:
                    flags.append(
                        {
                            "conflict_type": "duplicate_medication",
                            "severity": "medium",
                            "explanation": f"'{a}' and '{b}' belong to the same therapeutic class ({stem} family). Dual therapy requires clinical review.",
                        }
                    )

    # LLM Explanation Layer (Gemini 2.5 Flash or Claude)
    if flags:
        summary = None
        prompt = (
            f"You are HealLock AI Clinical Pharmacist. Medications: {meds}, Patient Allergies: {allergies}, Flags: {json.dumps(flags)}. "
            f"Provide a concise 1-sentence decision-support clinical advisory for the prescribing physician."
        )

        if settings.google_gemini_api_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.google_gemini_api_key}"
                with httpx.Client(timeout=6.0) as client:
                    r = client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]})
                    if r.status_code == 200:
                        summary = r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            except Exception:
                pass

        elif settings.anthropic_api_key:
            try:
                with httpx.Client(timeout=6.0) as client:
                    r = client.post(
                        "https://api.anthropic.com/v1/messages",
                        headers={"x-api-key": settings.anthropic_api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                        json={"model": "claude-3-5-sonnet-20241022", "max_tokens": 150, "messages": [{"role": "user", "content": prompt}]},
                    )
                    if r.status_code == 200:
                        summary = r.json()["content"][0]["text"].strip()
            except Exception:
                pass

        if summary:
            for f in flags:
                f["ai_summary"] = summary

    # Deduplicate flags
    seen = set()
    unique = []
    for f in flags:
        k = (f["conflict_type"], f["explanation"])
        if k not in seen:
            seen.add(k)
            unique.append(f)

    return unique
