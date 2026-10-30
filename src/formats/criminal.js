'use strict';

// Criminal formats under the Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS),
// the Bharatiya Nyaya Sanhita, 2023 (BNS) and the Negotiable Instruments Act.

const { advocateBlock, affidavitInSupport, partyBlock, listOfDocuments } = require('./common');

const CRIMINAL_NOTES =
  'Indian criminal practice conventions: cause title naming the crime number and police station, short numbered paragraphs, ' +
  'grounds stated separately, then the prayer. Offences arising on or after 1 July 2024 fall under the BNS and BNSS; earlier ' +
  'offences remain under the IPC, but proceedings begun after that date generally follow the BNSS — use the provisions given ' +
  'in the material and do not convert section numbers yourself. Never state criminal antecedents, custody dates or bail history ' +
  'that are not in the material: use [TO CONFIRM].';

const crimeCause = (court, caseType, petitionerRole) => `IN THE COURT OF THE ${court} AT [PLACE]

${caseType} No. [____] of [YEAR]
(Arising out of Crime No. [____] of [YEAR] of [NAME] Police Station)

BETWEEN:

${partyBlock(petitionerRole)}

AND

State of [STATE], represented by the Station House Officer, [NAME] Police Station
... RESPONDENT`;

const BAIL_FACTS = [
  'Accused / applicant (name, age, address, occupation)',
  'Crime number, police station, and offences alleged (sections)',
  'Date of arrest and period in custody',
  'Allegations against the applicant in brief',
  "Applicant's case: why the allegations are false or weak",
  'Whether the charge-sheet has been filed',
  'Criminal antecedents (or none)',
  'Earlier bail applications and their outcome',
  'Personal circumstances (family, health, roots in the community)',
  'Conditions the applicant is willing to accept',
];

const BAIL_GROUNDS = `GROUNDS
[NUMBER EACH GROUND. COVER, AS THE FACTS ALLOW:]
(a) The Applicant is innocent and has been falsely implicated. [REASONS.]
(b) The Applicant has been in custody since [DATE]. [INVESTIGATION IS COMPLETE / THE CHARGE-SHEET HAS BEEN FILED ON [DATE].] Further detention serves no purpose.
(c) The Applicant has no criminal antecedents. [OR: PARTICULARS AND WHY THEY DO NOT MATTER.]
(d) The Applicant is a permanent resident of [PLACE] with deep roots in society and is not likely to abscond.
(e) There is no likelihood of the Applicant tampering with evidence or influencing witnesses.
(f) [PARITY: CO-ACCUSED [NAME] HAS BEEN GRANTED BAIL BY ORDER DATED [DATE].]
(g) [PERSONAL CIRCUMSTANCES — HEALTH, DEPENDANTS, EMPLOYMENT.]
(h) The Applicant undertakes to abide by any conditions this Hon'ble Court may impose and to appear on every date of hearing.`;

module.exports = [
  {
    id: 'crim-bail-magistrate',
    title: 'Regular bail application (Magistrate)',
    category: 'Criminal',
    forum: 'Judicial Magistrate First Class / Chief Judicial Magistrate',
    law: 'Section 480 BNSS (earlier Section 437 CrPC)',
    use: 'Bail for an accused in custody, before the Magistrate.',
    facts: BAIL_FACTS,
    annexures: ['Copy of the FIR', 'Copy of the remand order', 'Charge-sheet, if filed', 'Bail orders of co-accused, if any'],
    instructions: `${CRIMINAL_NOTES} Address the usual tests: nature and gravity of the accusation, the evidence, risk of absconding, and risk of tampering with evidence or witnesses.`,
    template: `${crimeCause('[JUDICIAL MAGISTRATE FIRST CLASS / CHIEF JUDICIAL MAGISTRATE]', 'CRIMINAL MISCELLANEOUS PETITION', 'PETITIONER / ACCUSED NO. [__]')}

APPLICATION FOR BAIL UNDER SECTION 480 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023

The Petitioner / Accused most respectfully submits as follows:

1. The Petitioner is arraigned as Accused No. [__] in Crime No. [__] of [YEAR] registered by [NAME] Police Station for offences punishable under Sections [__] of the [BHARATIYA NYAYA SANHITA, 2023 / OTHER ACT].

2. The case of the prosecution, in brief, is that [ALLEGATIONS].

3. The Petitioner was arrested on [DATE] and has been in judicial custody since [DATE].

${BAIL_GROUNDS}

4. No other bail application filed by the Petitioner in this crime is pending before any court. [OR: PARTICULARS OF EARLIER APPLICATIONS.]

PRAYER
5. The Petitioner prays that this Hon'ble Court may be pleased to enlarge the Petitioner on bail in Crime No. [__] of [YEAR] of [NAME] Police Station, on such conditions as this Hon'ble Court deems fit, in the interest of justice.

${advocateBlock('PETITIONER')}`,
  },
  {
    id: 'crim-bail-sessions-hc',
    title: 'Bail application (Sessions Court / High Court)',
    category: 'Criminal',
    forum: 'Court of Session or High Court',
    law: 'Section 483 BNSS (earlier Section 439 CrPC)',
    use: 'Bail in serious offences, or after rejection by the Magistrate.',
    facts: [...BAIL_FACTS, 'Order of the lower court rejecting bail, if any (date and reasons)'],
    annexures: ['Copy of the FIR', 'Remand order', 'Order rejecting bail', 'Charge-sheet, if filed'],
    instructions:
      `${CRIMINAL_NOTES} Disclose all earlier bail applications in this crime and their result — many High Courts require this ` +
      'in a separate paragraph. Deal with the reasons given in any earlier rejection.',
    template: `${crimeCause('[PRINCIPAL DISTRICT AND SESSIONS JUDGE / HIGH COURT OF [STATE]]', 'CRIMINAL PETITION', 'PETITIONER / ACCUSED NO. [__]')}

PETITION FOR BAIL UNDER SECTION 483 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023

The Petitioner most respectfully submits as follows:

1. The Petitioner is Accused No. [__] in Crime No. [__] of [YEAR] of [NAME] Police Station for offences punishable under Sections [__].

2. The case of the prosecution, in brief, is that [ALLEGATIONS].

3. The Petitioner was arrested on [DATE] and is in judicial custody since then.

4. The Petitioner's application for bail before the [COURT] in [CRL. MISC. NO.] was rejected by order dated [DATE] on the ground that [REASONS]. [OR: THIS IS THE FIRST APPLICATION FOR BAIL.]

${BAIL_GROUNDS}

5. No other petition for the same relief has been filed before this Hon'ble Court or any other court, except [PARTICULARS, IF ANY].

PRAYER
6. The Petitioner prays that this Hon'ble Court may be pleased to enlarge the Petitioner on bail in Crime No. [__] of [YEAR] of [NAME] Police Station, on such conditions as this Hon'ble Court deems fit, in the interest of justice.

${advocateBlock('PETITIONER')}`,
  },
  {
    id: 'crim-anticipatory-bail',
    title: 'Anticipatory bail application',
    category: 'Criminal',
    forum: 'Court of Session or High Court',
    law: 'Section 482 BNSS (earlier Section 438 CrPC)',
    use: 'Protection from arrest for a person who apprehends arrest for a non-bailable offence.',
    facts: [
      'Applicant (name, age, address, occupation)',
      'Crime number / complaint and police station, offences alleged',
      'Why the applicant apprehends arrest (notices, raids, threats)',
      "Allegations in brief and the applicant's answer",
      'Criminal antecedents (or none)',
      'Willingness to cooperate with the investigation',
      'Earlier anticipatory bail applications',
    ],
    annexures: ['Copy of the FIR / complaint', 'Notices received from police, if any', 'Documents supporting innocence'],
    instructions:
      `${CRIMINAL_NOTES} Show a reasonable apprehension of arrest with specific facts. Offer the conditions in Section 482(2) BNSS ` +
      '(availability for interrogation, not inducing witnesses, not leaving India without permission). Check any statutory bar ' +
      'on anticipatory bail for the offence alleged (for example under Section 482(4) BNSS or Section 18 of the SC/ST (Prevention of Atrocities) Act).',
    template: `${crimeCause('[PRINCIPAL DISTRICT AND SESSIONS JUDGE / HIGH COURT OF [STATE]]', 'CRIMINAL PETITION', 'PETITIONER')}

PETITION FOR ANTICIPATORY BAIL UNDER SECTION 482 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023

The Petitioner most respectfully submits as follows:

1. [WHO THE PETITIONER IS.]

2. Crime No. [__] of [YEAR] has been registered by [NAME] Police Station against the Petitioner for offences punishable under Sections [__], on the complaint of [COMPLAINANT], alleging that [ALLEGATIONS].

3. The Petitioner reasonably apprehends arrest because [SPECIFIC FACTS — NOTICES, VISITS BY POLICE, THREATS].

GROUNDS
(a) The allegations are false and motivated. [REASONS.]
(b) The dispute is essentially [CIVIL / MATRIMONIAL / COMMERCIAL] in nature.
(c) The Petitioner has no criminal antecedents and is a permanent resident of [PLACE].
(d) Custodial interrogation of the Petitioner is not necessary. The Petitioner is ready to cooperate with the investigation and appear whenever required.
(e) The Petitioner undertakes to abide by all conditions under Section 482(2) of the BNSS and any others this Hon'ble Court may impose.

4. No other petition for anticipatory bail in this crime is pending before any court. [OR: PARTICULARS.]

PRAYER
5. The Petitioner prays that this Hon'ble Court may be pleased to direct that, in the event of arrest in Crime No. [__] of [YEAR] of [NAME] Police Station, the Petitioner be released on bail on such conditions as this Hon'ble Court deems fit, in the interest of justice.

${advocateBlock('PETITIONER')}`,
  },
  {
    id: 'crim-cheque-bounce-complaint',
    title: 'Cheque bounce complaint (Section 138 NI Act)',
    category: 'Criminal',
    forum: 'Judicial Magistrate First Class having jurisdiction over the payee\'s bank branch',
    law: 'Sections 138, 141 & 142 Negotiable Instruments Act, 1881; Section 223 BNSS',
    use: 'Prosecuting the drawer of a dishonoured cheque after the statutory demand notice is not complied with.',
    facts: [
      'Complainant (and, if a company, the authorised representative)',
      'Accused / drawer (and directors in charge, if a company — Section 141)',
      'Legally enforceable debt or liability for which the cheque was issued',
      'Cheque details: number, date, amount, drawee bank and branch',
      'Date of presentation and the bank through which presented',
      'Date of the return memo and the reason for dishonour',
      'Date of the demand notice, mode of dispatch, date of service / refusal',
      'Whether any payment was made within 15 days of service',
      "Payee's bank branch where the cheque was presented or the account is maintained (jurisdiction)",
    ],
    annexures: [
      'Original cheque',
      'Bank return memo',
      'Demand notice, postal receipts and tracking / acknowledgement',
      'Documents proving the debt',
      'Board resolution / authorisation (if the complainant is a company)',
    ],
    instructions:
      `${CRIMINAL_NOTES} Plead each statutory ingredient with dates: (1) the cheque was issued for a legally enforceable debt; ` +
      '(2) it was presented within its validity; (3) it was dishonoured; (4) the demand notice was sent within 30 days of ' +
      'receiving information of dishonour; (5) payment was not made within 15 days of service; (6) the complaint is filed within ' +
      'one month of the cause of action (Section 142(1)(b)). Jurisdiction lies where the payee\'s bank branch is (Section 142(2)). ' +
      'If the accused is a company, plead specifically how each director was in charge of and responsible for its business (Section 141). ' +
      'Whether the pre-cognizance hearing under the proviso to Section 223(1) BNSS applies to NI Act complaints has been the subject ' +
      'of conflicting decisions — verify the current position before filing.',
    template: `IN THE COURT OF THE JUDICIAL MAGISTRATE FIRST CLASS [__] AT [PLACE]

C.C. / P.C.R. No. [____] of [YEAR]

${partyBlock('COMPLAINANT')}

VERSUS

${partyBlock('ACCUSED')}

COMPLAINT UNDER SECTION 138 READ WITH SECTION 142 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881, AND SECTION 223 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023

The Complainant most respectfully submits as follows:

1. [DESCRIPTION OF THE COMPLAINANT AND THE ACCUSED, AND THEIR RELATIONSHIP.]

2. The Accused owed the Complainant a legally enforceable debt of Rs. [AMOUNT] towards [NATURE OF THE DEBT], incurred on [DATE].

3. In discharge of that liability, the Accused issued cheque No. [__] dated [DATE] for Rs. [AMOUNT], drawn on [BANK, BRANCH].

4. The Complainant presented the cheque for collection through [COMPLAINANT'S BANK, BRANCH] on [DATE]. It was returned unpaid with the endorsement "[REASON]" by return memo dated [DATE], received by the Complainant on [DATE].

5. Within 30 days of receiving information of the dishonour, the Complainant issued a demand notice dated [DATE] to the Accused by [REGISTERED POST / SPEED POST / COURIER / EMAIL], demanding payment of the cheque amount within 15 days of receipt. The notice was [SERVED ON [DATE] / RETURNED WITH THE ENDORSEMENT "[__]" ON [DATE]].

6. The Accused has failed to pay the cheque amount within 15 days of service of the notice. The cause of action therefore arose on [DATE], and this complaint is filed within one month from that date.

7. The Accused has thereby committed an offence punishable under Section 138 of the Negotiable Instruments Act, 1881.

8. [IF THE ACCUSED IS A COMPANY: ACCUSED NOS. [__] WERE DIRECTORS IN CHARGE OF AND RESPONSIBLE TO THE COMPANY FOR THE CONDUCT OF ITS BUSINESS WHEN THE OFFENCE WAS COMMITTED, AND ARE LIABLE UNDER SECTION 141.]

JURISDICTION
9. The cheque was delivered for collection through [BANK, BRANCH], where the Complainant maintains the account, which is within the jurisdiction of this Hon'ble Court (Section 142(2)(a) of the Act).

PRAYER
10. The Complainant prays that this Hon'ble Court may be pleased to:
(a) take cognizance of the offence under Section 138 of the Negotiable Instruments Act, 1881, and summon the Accused;
(b) try and punish the Accused in accordance with law;
(c) direct the Accused to pay compensation of [TWICE THE CHEQUE AMOUNT / Rs. [__]] to the Complainant; and
(d) direct the Accused to pay interim compensation under Section 143A of the Act.

${advocateBlock('COMPLAINANT')}

${affidavitInSupport('COMPLAINANT', 'complaint')}

${listOfDocuments}`,
  },
  {
    id: 'crim-private-complaint',
    title: 'Private complaint to the Magistrate',
    category: 'Criminal',
    forum: 'Judicial Magistrate First Class',
    law: 'Section 223 BNSS (earlier Section 200 CrPC)',
    use: 'Setting criminal law in motion directly before the Magistrate.',
    facts: [
      'Complainant and proposed accused (names, addresses)',
      'The incident(s): date, time, place, what each accused did',
      'Offences made out (sections)',
      'Witnesses',
      'Police complaint made and its result, if any',
    ],
    annexures: ['Documents and evidence supporting the complaint', 'Copy of any complaint made to the police', 'List of witnesses'],
    instructions:
      `${CRIMINAL_NOTES} Attribute specific acts to each accused with dates and places — vague, omnibus allegations are a common ground ` +
      'for quashing. Under the first proviso to Section 223(1) BNSS the Magistrate must give the proposed accused an opportunity ' +
      'of hearing before taking cognizance; the Supreme Court has held that cognizance without it is void.',
    template: `IN THE COURT OF THE JUDICIAL MAGISTRATE FIRST CLASS [__] AT [PLACE]

PRIVATE COMPLAINT No. [____] of [YEAR]

${partyBlock('COMPLAINANT')}

VERSUS

${partyBlock('ACCUSED')}

COMPLAINT UNDER SECTION 223 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023, FOR OFFENCES PUNISHABLE UNDER SECTIONS [__] OF THE BHARATIYA NYAYA SANHITA, 2023

The Complainant most respectfully submits as follows:

1. [WHO THE COMPLAINANT IS AND THEIR RELATIONSHIP WITH THE ACCUSED.]

2. On [DATE] at about [TIME], at [PLACE], the Accused [SPECIFIC ACTS OF EACH ACCUSED].

3. [FURTHER FACTS, IN ORDER.]

4. The Complainant reported the matter to [NAME] Police Station on [DATE], but [NO ACTION WAS TAKEN / RESULT].

5. The above acts of the Accused constitute offences punishable under Sections [__] of the [ACT].

6. The offences took place within the jurisdiction of this Hon'ble Court.

7. The Complainant and the witnesses named in the list below are ready to be examined.

PRAYER
8. The Complainant prays that this Hon'ble Court may be pleased to take cognizance of the offences, after hearing the proposed accused as required, issue process against the Accused, and try and punish them in accordance with law.

LIST OF WITNESSES
1. [NAME, ADDRESS]
2. [NAME, ADDRESS]

${advocateBlock('COMPLAINANT')}

${listOfDocuments}`,
  },
  {
    id: 'crim-175-3-application',
    title: 'Application for direction to investigate (FIR not registered)',
    category: 'Criminal',
    forum: 'Judicial Magistrate First Class',
    law: 'Section 175(3) BNSS (earlier Section 156(3) CrPC); Section 173(4) BNSS',
    use: 'When the police refuse to register an FIR for a cognizable offence.',
    facts: [
      'Applicant and proposed accused',
      'The cognizable offence: date, place, acts',
      'Complaint given to the SHO (date) and refusal / inaction',
      'Complaint to the Superintendent of Police under Section 173(4) (date) and its result',
    ],
    annexures: ['Complaint to the SHO with acknowledgement', 'Complaint to the SP with acknowledgement', 'Supporting documents'],
    instructions:
      `${CRIMINAL_NOTES} Show that the applicant first approached the officer in charge and then the Superintendent of Police under ` +
      'Section 173(4) BNSS. The application must be supported by the applicant\'s affidavit. Section 175(3) requires the Magistrate ' +
      'to consider the submission of the police officer, so state the police\'s stand if known.',
    template: `IN THE COURT OF THE JUDICIAL MAGISTRATE FIRST CLASS [__] AT [PLACE]

CRIMINAL MISCELLANEOUS No. [____] of [YEAR]

${partyBlock('APPLICANT')}

VERSUS

${partyBlock('PROPOSED ACCUSED')}

APPLICATION UNDER SECTION 175(3) OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023, FOR A DIRECTION TO REGISTER AND INVESTIGATE

The Applicant most respectfully submits as follows:

1. [FACTS DISCLOSING THE COGNIZABLE OFFENCE, WITH DATES AND PLACES.]

2. On [DATE], the Applicant lodged a written complaint with the Station House Officer, [NAME] Police Station, but no FIR was registered. [DETAILS.]

3. On [DATE], the Applicant sent the substance of the complaint to the Superintendent of Police, [DISTRICT], under Section 173(4) of the BNSS. [NO ACTION HAS BEEN TAKEN / RESULT.]

4. The facts disclose cognizable offences punishable under Sections [__] of the [ACT], which require investigation by the police.

PRAYER
5. The Applicant prays that this Hon'ble Court may be pleased to direct the Station House Officer, [NAME] Police Station, to register an FIR on the Applicant's complaint and investigate the matter in accordance with law.

${advocateBlock('APPLICANT')}

${affidavitInSupport('APPLICANT', 'application')}`,
  },
  {
    id: 'crim-quashing-528',
    title: 'Petition to quash FIR / proceedings (High Court)',
    category: 'Criminal',
    forum: 'High Court',
    law: 'Section 528 BNSS (earlier Section 482 CrPC); Article 226 of the Constitution where appropriate',
    use: 'Quashing an FIR, charge-sheet or complaint that is an abuse of process.',
    facts: [
      'Petitioner(s) and the complainant / State',
      'FIR / complaint / case number, police station, court, offences',
      'Allegations in brief',
      'Why no offence is made out, or why the proceedings are an abuse of process',
      'Stage of the case (investigation / charge-sheet / trial)',
      'Settlement between the parties, if that is the ground',
    ],
    annexures: ['FIR / complaint', 'Charge-sheet, if filed', 'Settlement deed / compromise, if any', 'Relevant documents'],
    instructions:
      `${CRIMINAL_NOTES} Frame the grounds around the accepted categories for quashing — for example, the allegations taken at face ` +
      'value disclose no offence; the dispute is purely civil; the proceedings are malicious; or the parties have settled a ' +
      'private dispute. Do not cite case law unless it is in the material; leave [CITATION] placeholders instead.',
    template: `IN THE HIGH COURT OF [STATE] AT [PLACE]

CRIMINAL PETITION No. [____] of [YEAR]

${partyBlock('PETITIONER(S)')}

VERSUS

1. State of [STATE], represented by the Station House Officer, [NAME] Police Station
2. [COMPLAINANT NAME, ADDRESS]
... RESPONDENTS

PETITION UNDER SECTION 528 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023, TO QUASH [FIR / CHARGE-SHEET / PROCEEDINGS] IN [CRIME NO. / C.C. NO.] [__] OF [YEAR]

The Petitioner(s) most respectfully submit as follows:

1. [WHO THE PETITIONERS ARE.]

2. Respondent No. 2 lodged [AN FIR / A COMPLAINT] on [DATE], registered as [NUMBER] for offences punishable under Sections [__], alleging that [ALLEGATIONS].

3. [STAGE OF THE CASE.]

GROUNDS
(a) Even if the allegations are taken at face value and accepted in their entirety, they do not make out any offence against the Petitioner(s). [REASONS.]
(b) [THE DISPUTE IS ESSENTIALLY CIVIL / COMMERCIAL IN NATURE AND HAS BEEN GIVEN A CRIMINAL COLOUR.]
(c) [THE PROCEEDINGS ARE MALICIOUS AND INSTITUTED WITH AN ULTERIOR MOTIVE.]
(d) [THE PARTIES HAVE AMICABLY SETTLED THE DISPUTE.]
(e) Continuing the proceedings would be an abuse of the process of the Court.

4. The Petitioner(s) have not filed any other petition for the same relief before this Hon'ble Court or the Supreme Court.

PRAYER
5. The Petitioner(s) pray that this Hon'ble Court may be pleased to:
(a) quash [THE FIR / CHARGE-SHEET / ALL PROCEEDINGS] in [NUMBER] pending on the file of [COURT], insofar as the Petitioner(s) are concerned; and
(b) pending disposal of this petition, stay all further proceedings in [NUMBER].

${advocateBlock('PETITIONER(S)')}`,
  },
  {
    id: 'crim-revision',
    title: 'Criminal revision petition',
    category: 'Criminal',
    forum: 'Court of Session or High Court',
    law: 'Sections 438 and 440 / 442 BNSS (earlier Sections 397, 399 and 401 CrPC)',
    use: 'Challenging an order of a subordinate criminal court for illegality, impropriety or incorrectness.',
    facts: [
      'Order under challenge: court, case number, date',
      'Petitioner and respondents',
      'What the lower court decided and why',
      'Errors in the order',
      'Whether the order is interlocutory (revision does not lie against a purely interlocutory order)',
    ],
    annexures: ['Certified copy of the impugned order', 'Relevant papers from the lower court'],
    instructions:
      `${CRIMINAL_NOTES} Revision lies against a final or intermediate order, not a purely interlocutory one — address this. ` +
      'Limitation for revision is 90 days (Article 131, Limitation Act).',
    template: `IN THE [COURT OF THE SESSIONS JUDGE AT [PLACE] / HIGH COURT OF [STATE] AT [PLACE]]

CRIMINAL REVISION PETITION No. [____] of [YEAR]

${partyBlock('PETITIONER')}

VERSUS

${partyBlock('RESPONDENT(S)')}

CRIMINAL REVISION PETITION UNDER SECTION 438 READ WITH SECTION [440 / 442] OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023

The Petitioner most respectfully submits as follows:

1. This revision petition is directed against the order dated [DATE] passed by the [COURT] in [CASE NO.], by which [WHAT WAS ORDERED].

2. [BRIEF FACTS.]

GROUNDS
(a) The impugned order is illegal, improper and incorrect. [REASONS.]
(b) [SPECIFIC ERROR OF LAW / JURISDICTION.]
(c) [SPECIFIC ERROR IN APPRECIATION OF THE RECORD.]

3. The petition is filed within the period of limitation. [DATES.]

PRAYER
4. The Petitioner prays that this Hon'ble Court may be pleased to call for the records in [CASE NO.], set aside the order dated [DATE], and [CONSEQUENTIAL RELIEF].

${advocateBlock('PETITIONER')}`,
  },
];
