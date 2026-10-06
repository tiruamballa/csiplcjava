"""The initial student list, exactly as supplied, plus the logic that cleans it safely.

This file is only used ONCE, to load the first batch of students (python seed.py) and to
decide the lab of students that already exist in an older database.
After that, students are added / edited / moved between labs from the Admin -> Students page.
You never need to edit this file.

Rules applied to the list (in order):
  * The FIRST 40 entries are Lab 1, every later entry is Lab 2.
  * A registration number written like an e-mail ("25B91A0554@srkrec.ac.in") is cleaned to the part
    before the "@" so it can be compared with the others.
  * Registration numbers must be unique (compared ignoring upper/lower case). If the same number
    appears twice, ONE student is created - never two. The first entry decides the lab; the
    spelling of the registration number is kept exactly as supplied. Every duplicate is reported.
"""

# (name, registration number) - in the exact order supplied.
RAW_STUDENTS: list[tuple[str, str]] = [
    ("PRIYANKA POTHUMUDI", "25B91A54J5"),
    ("HARSHITHA CHATRAGADDA", "25b91a6140"),
    ("Poram Rishitha", "25B91A05Q1"),
    ("yadala siddu", "25B91A61R1"),
    ("SORNAPUDI YASWANTH SAI", "25B91A61M7"),
    ("Konduru chaitanya", "26B95A5414"),
    ("Jaswanth Maddimsetti", "25B91A61D7"),
    ("Talluri Naga Monisha", "25B91A05U3"),
    ("Teja vissarapu", "25B91A61R0"),
    ("Adapa Pavan Manohar", "25B91A5403"),
    ("Kowsalya", "25B91A05R9"),
    ("Dantala Lahari", "25B91A5434"),
    ("GURUMPALLI LOKESH", "25B91A5470"),
    ("Saragula Navya Sri", "25B91A12G3"),
    ("Gullampudi veera naga shirisha", "25B91A1256"),
    ("Ch SrivalliMokshagna", "25B91A0554@srkrec.ac.in"),
    ("Rubiya", "25B91A12F8"),
    ("K.Hemanth Kumar", "25B91A61D0"),
    ("CHITTA JYOTHI NAGA SWAROOP", "25B91A1225"),
    ("Veeraboina vidyakala", "25B91A61Q2"),
    ("DULLA NAVEEN", "26B95A5406"),
    ("KUNCHE LAKSHMI", "25B91A1295"),
    ("Veeramasi Sri ganesh", "25B91A61Q3"),
    ("Nazeemunnisa", "25B91A12C1"),
    ("Kolla Dhathri Sri Sai", "25B91A54A7"),
    ("Kunchala Bhargavi", "25B91A1294"),
    ("Tetali Sri Ganesh Ranga Reddy", "25b91a54n7"),
    ("Runku Priya Dharshini", "25b91a12f9"),
    ("Varshitha Veenala", "25B91A12J3"),
    ("PRASANNA UNDRAJAVARAPU", "25B91A12H7"),
    ("Y N V Avinash", "25B91A61R2"),
    ("P.Sri Joshna", "25B91A54G4"),
    ("Samsani Nogaswi", "25B91A12G0"),
    ("Munagala Tejaswini", "25B91A54F2"),
    ("KANDIBOINA YUVA KUMAR", "26B95A1209"),
    ("Pattem Suresh", "25B91A05P2"),
    ("Patcha Lukesh Venkata Sai", "25B91A05P0"),
    ("Tammavarapu Uday Bhargav", "25B91A54N2"),
    ("Shaik Hussain Basha", "25B91A05S8"),
    ("K. Anirudh", "25B91A5493"),
    # ---- from here on: Lab 2 ----
    ("Posetti sri Satya keerthi", "25B91A54J4"),
    ("GUDLA KEDAR PAVAN KUMAR", "25B91A1255"),
    ("Madhu Jyothsna .Botta", "25B91A5417"),
    ("Nalla Vasundara", "25B91A54G1"),
    ("P.Lohitha", "25B91A54H5"),
    ("Meesala Kusuma Sri Durga", "25B91A54E3"),
    ("PENMETSA PUJITHA", "25B91A54H9"),
    ("P. Vidya Brahmani", "25B91A54H1"),
    ("Morla Geethanjali", "25B91A12B2"),
    ("BOTCHA HEMANTH", "25B91A5416"),
    ("Shaik Shafiya", "25B91A61L7"),
    ("Vydyabhushana Gnanaroopesh sharma", "25B91A05X3"),
    ("Sundaraneedi Sarvani", "25B91A61N1"),
    ("Devani sirisha", "25B91A6157"),
    ("TALLAPOGU VARSHINI", "25B91A61N5"),
    ("Tirumalasetty Abhinaya sri", "26B95A1220"),
    ("Pepakayala Vijayalakshmi", "26B95A1215"),
    ("CHUNDURI KULADEEPAK", "25B91A6152"),
    ("Teki Mounika", "25B91A61P1"),
    ("CHANCHALI SRIVALLI MOKSHAGNA", "25B91A0554"),
    ("Yk Bharath kumar", "25B91A05X8"),
    ("Tadi Poojitha", "25B91A54N1"),
    ("Bhavyasri Varikuti", "25B91A05W4"),
    ("TATI.AKSHITHA", "25B91A54N5"),
    ("Yarlagadda Monya sri", "25B91A54R5"),
    ("Thote Meghana", "25B91A54P5"),
    ("CHENNU NEHA JALANI", "26B95A5403"),
    ("Jijjuvarapu Keerthana", "25B91A05B6"),
    ("Bhargavi sristu", "25B91A61M9"),
    ("JANNU BHAVYA KOTESWARI", "26B95A5411"),
    ("BEZAWADA LAKSHMI PRASANNA", "26B95A6104"),
    ("Vasamsetti Eswari", "26B95A0712"),
    ("Sahitya gadili", "26B95A1207"),
    ("Malleda Joshitha Priya", "25B91A54D3"),
    ("KALIDINDI NITYA SRI SURYA HASINI", "25B91A5487"),
    ("CHERUKURI ROOPA", "25B91A0431"),
    ("Neelam Navya", "25B91A54G3"),
]

LAB_1_COUNT = 40  # the first 40 entries start in Lab 1

# Where the same registration number appears twice, which spelling of the NAME to keep.
# 25B91A0554 was entered twice ("Ch SrivalliMokshagna" and "CHANCHALI SRIVALLI MOKSHAGNA").
# The second entry is the complete name, so it is kept. Change it later from Admin -> Students -> Edit.
PREFERRED_NAME: dict[str, str] = {
    "25b91a0554": "CHANCHALI SRIVALLI MOKSHAGNA",
}


def _clean_reg(reg: str) -> str:
    reg = " ".join(reg.split())
    return reg.split("@", 1)[0] if "@" in reg else reg


def build_initial_students() -> tuple[list[dict], list[str]]:
    """Returns (students, notes).

    students: [{"roll_number", "name", "lab"}] with NO duplicate registration numbers.
    notes:    human-readable messages about anything that was cleaned or merged.
    """
    students: dict[str, dict] = {}
    notes: list[str] = []

    for position, (name, raw_reg) in enumerate(RAW_STUDENTS, start=1):
        reg = _clean_reg(raw_reg)
        key = reg.lower()
        lab = "Lab 1" if position <= LAB_1_COUNT else "Lab 2"
        name = " ".join(name.split())

        if reg != " ".join(raw_reg.split()):
            notes.append(f'#{position}: registration number "{raw_reg}" looked like an e-mail address; used "{reg}".')

        if key in students:
            kept = students[key]
            if key in PREFERRED_NAME:
                kept["name"] = PREFERRED_NAME[key]
            notes.append(
                f'#{position}: registration number {reg} is already used by an earlier entry '
                f'(#{kept["position"]}). Created ONE student: "{kept["name"]}" in {kept["lab"]} '
                f'(ignored the duplicate "{name}"). Fix it in Admin -> Students if this is wrong.'
            )
            continue

        students[key] = {"roll_number": reg, "name": name, "lab": lab, "position": position}

    result = [{k: v for k, v in s.items() if k != "position"} for s in students.values()]
    return result, notes


def initial_lab_by_reg() -> dict[str, str]:
    """{lowercase registration number: lab} - used when upgrading an older database."""
    students, _ = build_initial_students()
    return {s["roll_number"].lower(): s["lab"] for s in students}
