'use strict';

// Family law and consumer formats.

const { advocateBlock, verification, affidavitInSupport, partyBlock, listOfDocuments } = require('./common');

const FAMILY_NOTES =
  'Family court conventions: cause title naming both spouses with ages and addresses; marriage details (date, place, ' +
  'ceremonies, registration); children with dates of birth; facts in chronological order; the statutory ground pleaded ' +
  'precisely; jurisdiction; statements that there is no collusion and no earlier proceeding on the same ground (or ' +
  'particulars of any). Write about the parties respectfully and factually — avoid inflammatory language.';

const familyCause = (caseType) => `IN THE COURT OF THE [PRINCIPAL JUDGE, FAMILY COURT] AT [PLACE]

${caseType} No. [____] of [YEAR]

BETWEEN:

${partyBlock('PETITIONER')}

AND

${partyBlock('RESPONDENT')}`;

const MARRIAGE_FACTS = [
  'Petitioner and Respondent (names, ages, religion, occupations, addresses)',
  'Date and place of marriage, form of ceremonies, registration details',
  'Children (names, dates of birth, who has custody)',
  'Where the parties last resided together',
];

module.exports = [
  {
    id: 'fam-divorce-hma-13',
    title: 'Divorce petition (contested)',
    category: 'Family & consumer',
    forum: 'Family Court (or District Court where none)',
    law: 'Section 13(1) Hindu Marriage Act, 1955; Sections 19 & 23 HMA; Section 7 Family Courts Act, 1984',
    use: 'Divorce on a statutory ground — cruelty, desertion, adultery, conversion, unsoundness of mind, etc.',
    facts: [
      ...MARRIAGE_FACTS,
      'Ground(s) of divorce under Section 13(1) relied on',
      'Specific incidents supporting each ground (dates, places, what happened)',
      'Date of separation and who left whom',
      'Earlier proceedings between the parties (DV, maintenance, police complaints)',
      'Permanent alimony, custody or other reliefs sought',
    ],
    annexures: ['Marriage certificate / invitation / photographs', 'Birth certificates of children', 'Documents supporting the incidents', 'Copies of earlier proceedings'],
    instructions:
      `${FAMILY_NOTES} Plead each incident of cruelty or desertion specifically, with dates. Desertion requires a continuous ` +
      'period of at least two years before the petition. Include the Section 23 statements: the petition is not presented in ' +
      'collusion, the petitioner has not condoned or connived at the matrimonial offence, and there has been no unnecessary delay.',
    template: `${familyCause('MATRIMONIAL CASE (M.C.)')}

PETITION UNDER SECTION 13(1)([CLAUSE]) OF THE HINDU MARRIAGE ACT, 1955, FOR DISSOLUTION OF MARRIAGE BY A DECREE OF DIVORCE

The Petitioner most respectfully submits as follows:

1. The marriage between the Petitioner and the Respondent was solemnised on [DATE] at [PLACE] according to [HINDU RITES AND CUSTOMS]. [REGISTERED ON [DATE] UNDER NO. [__].] Both parties are Hindus.

2. Out of the wedlock, [CHILDREN — NAMES AND DATES OF BIRTH / NO CHILD WAS BORN].

3. After the marriage the parties resided together at [PLACE] until [DATE].

4. [FACTS SUPPORTING THE GROUND — EACH INCIDENT IN A SEPARATE PARAGRAPH WITH DATE AND PLACE.]

5. The above conduct of the Respondent amounts to [CRUELTY / DESERTION / OTHER GROUND] within the meaning of Section 13(1)([CLAUSE]) of the Hindu Marriage Act, 1955.

6. The parties have been living separately since [DATE]. [ATTEMPTS AT RECONCILIATION.]

7. [EARLIER PROCEEDINGS BETWEEN THE PARTIES, OR: NO OTHER PROCEEDING HAS BEEN FILED BETWEEN THE PARTIES ON THE SAME GROUND.]

8. This petition is not presented in collusion with the Respondent. The Petitioner has not condoned or connived at the conduct complained of, and there has been no unnecessary or improper delay in filing it.

JURISDICTION
9. This Hon'ble Court has jurisdiction under Section 19 of the Hindu Marriage Act, 1955, as [THE MARRIAGE WAS SOLEMNISED / THE RESPONDENT RESIDES / THE PARTIES LAST RESIDED TOGETHER / THE PETITIONER-WIFE RESIDES] within its limits.

10. Court fee of Rs. [__] is paid.

PRAYER
11. The Petitioner prays that this Hon'ble Court may be pleased to:
(a) dissolve the marriage solemnised on [DATE] between the Petitioner and the Respondent by a decree of divorce;
(b) [GRANT PERMANENT ALIMONY / CUSTODY OF THE MINOR CHILD / OTHER RELIEF]; and
(c) grant such other relief as this Hon'ble Court deems fit.

${advocateBlock('PETITIONER')}

${verification('PETITIONER', 'petition')}

${affidavitInSupport('PETITIONER', 'petition')}

${listOfDocuments}`,
  },
  {
    id: 'fam-mutual-divorce-13b',
    title: 'Mutual consent divorce (joint petition)',
    category: 'Family & consumer',
    forum: 'Family Court',
    law: 'Section 13B Hindu Marriage Act, 1955',
    use: 'Joint petition when both spouses agree to divorce.',
    facts: [
      ...MARRIAGE_FACTS,
      'Date since which the parties have lived separately (at least one year)',
      'Agreed terms: permanent alimony (amount, mode, schedule), stridhan / articles, custody and visitation, withdrawal of other cases',
      'Whether waiver of the six-month waiting period will be sought',
    ],
    annexures: ['Marriage certificate', 'Memorandum of settlement / terms', 'Address and identity proofs of both parties', 'Photographs of both parties'],
    instructions:
      `${FAMILY_NOTES} Both spouses are petitioners. State that they have been living separately for one year or more, that they ` +
      'have not been able to live together, and that they have mutually agreed that the marriage should be dissolved, without ' +
      'force, fraud or undue influence. Set out all settlement terms fully. The second motion may be moved after six months; ' +
      'the Supreme Court has held this period may be waived in suitable cases — include a waiver application only if instructed.',
    template: `IN THE COURT OF THE [PRINCIPAL JUDGE, FAMILY COURT] AT [PLACE]

M.C. No. [____] of [YEAR]

1. [HUSBAND'S FULL NAME], son of [__], aged about [__] years, [OCCUPATION], residing at [ADDRESS] ... PETITIONER NO. 1
2. [WIFE'S FULL NAME], daughter of [__], aged about [__] years, [OCCUPATION], residing at [ADDRESS] ... PETITIONER NO. 2

JOINT PETITION UNDER SECTION 13B(1) OF THE HINDU MARRIAGE ACT, 1955, FOR DISSOLUTION OF MARRIAGE BY MUTUAL CONSENT

The Petitioners most respectfully submit as follows:

1. The marriage between Petitioner No. 1 and Petitioner No. 2 was solemnised on [DATE] at [PLACE] according to [HINDU RITES AND CUSTOMS].

2. [CHILDREN, OR: NO CHILD WAS BORN OUT OF THE WEDLOCK.]

3. Owing to differences in temperament, the Petitioners have been living separately since [DATE], a period of more than one year, and have not been able to live together.

4. The Petitioners have mutually agreed that the marriage should be dissolved. Their consent has not been obtained by force, fraud or undue influence.

5. The Petitioners have settled all their claims on the following terms:
(a) Permanent alimony: [AMOUNT, MODE, SCHEDULE]
(b) Stridhan and articles: [__]
(c) Custody of and access to the child: [__]
(d) Other proceedings between the parties shall be withdrawn: [PARTICULARS]
(e) Neither party shall have any further claim against the other, except as stated above.

6. The petition is not presented in collusion, and there is no unnecessary delay.

7. The parties last resided together at [PLACE], within the jurisdiction of this Hon'ble Court.

PRAYER
8. The Petitioners pray that this Hon'ble Court may be pleased to record their statements on this first motion and, on the second motion, dissolve their marriage by a decree of divorce by mutual consent, on the terms set out above.

Place: [PLACE]
Date: [DATE]

PETITIONER NO. 1                PETITIONER NO. 2

Through Counsel
[ADVOCATE NAME(S)]

${verification('PETITIONERS', 'petition')}`,
  },
  {
    id: 'fam-rcr-hma-9',
    title: 'Restitution of conjugal rights',
    category: 'Family & consumer',
    forum: 'Family Court',
    law: 'Section 9 Hindu Marriage Act, 1955',
    use: 'When one spouse has withdrawn from the society of the other without reasonable excuse.',
    facts: [...MARRIAGE_FACTS, 'When and how the Respondent withdrew from the Petitioner\'s society', 'Efforts made to resume cohabitation'],
    annexures: ['Marriage certificate', 'Correspondence / messages showing efforts to reconcile'],
    instructions: `${FAMILY_NOTES} Plead that the Respondent withdrew from the Petitioner's society without reasonable excuse, and the Petitioner's willingness to resume cohabitation.`,
    template: `${familyCause('M.C.')}

PETITION UNDER SECTION 9 OF THE HINDU MARRIAGE ACT, 1955, FOR RESTITUTION OF CONJUGAL RIGHTS

The Petitioner most respectfully submits as follows:

1. [MARRIAGE DETAILS.]

2. [MATRIMONIAL LIFE AND CHILDREN.]

3. On [DATE], the Respondent withdrew from the society of the Petitioner [CIRCUMSTANCES], without any reasonable excuse.

4. The Petitioner made efforts to bring the Respondent back on [DATES / DETAILS], but the Respondent refused.

5. The Petitioner is ready and willing to resume cohabitation and to discharge all marital obligations.

6. There is no collusion, and no legal ground exists why relief should not be granted. [JURISDICTION.]

PRAYER
7. The Petitioner prays that this Hon'ble Court may be pleased to pass a decree for restitution of conjugal rights directing the Respondent to resume cohabitation with the Petitioner.

${advocateBlock('PETITIONER')}

${verification('PETITIONER', 'petition')}`,
  },
  {
    id: 'fam-maintenance-144',
    title: 'Maintenance application',
    category: 'Family & consumer',
    forum: 'Family Court / Judicial Magistrate First Class',
    law: 'Section 144 BNSS (earlier Section 125 CrPC); interim maintenance under the same section',
    use: 'Maintenance for a wife, children or parents unable to maintain themselves.',
    facts: [
      'Applicant(s) and Respondent (names, ages, addresses, relationship)',
      'Marriage / relationship details and children',
      'Neglect or refusal to maintain: since when and how',
      "Applicant's income and expenses",
      "Respondent's income, occupation and assets",
      'Monthly amount claimed and interim maintenance sought',
    ],
    annexures: [
      'Proof of marriage / relationship',
      "Proof of the Respondent's income (salary slips, ITRs, business details)",
      'Affidavit of assets, income and expenditure',
    ],
    instructions:
      'Plead that the Respondent has sufficient means and has neglected or refused to maintain the applicant, who is unable to ' +
      'maintain herself / himself. Claim interim maintenance and litigation expenses. Both parties must file an affidavit ' +
      'disclosing assets, income and liabilities, in the format prescribed by the Supreme Court in maintenance matters — ' +
      'mention that it is annexed.',
    template: `IN THE COURT OF THE [PRINCIPAL JUDGE, FAMILY COURT / JUDICIAL MAGISTRATE FIRST CLASS] AT [PLACE]

CRIMINAL MISCELLANEOUS No. [____] of [YEAR]

${partyBlock('APPLICANT(S)')}

VERSUS

${partyBlock('RESPONDENT')}

APPLICATION UNDER SECTION 144 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA, 2023, FOR MAINTENANCE

The Applicant(s) most respectfully submit as follows:

1. [RELATIONSHIP — MARRIAGE ON [DATE] AT [PLACE]; CHILDREN.]

2. Since [DATE], the Respondent has neglected and refused to maintain the Applicant(s). [FACTS.]

3. The Applicant(s) have no independent income sufficient to maintain themselves. [DETAILS OF INCOME AND EXPENSES.]

4. The Respondent is [OCCUPATION], earning about Rs. [__] per month, and owns [ASSETS]. He has sufficient means to maintain the Applicant(s).

5. The Applicant(s) require Rs. [__] per month towards [FOOD, RESIDENCE, EDUCATION, MEDICAL EXPENSES].

6. The Applicant(s) also seek interim maintenance of Rs. [__] per month and litigation expenses of Rs. [__] pending disposal of this application.

7. An affidavit disclosing the Applicant's assets, income and expenditure is annexed.

8. This Hon'ble Court has jurisdiction as [THE APPLICANT RESIDES / THE RESPONDENT RESIDES / THE PARTIES LAST RESIDED] within its limits.

PRAYER
9. The Applicant(s) pray that this Hon'ble Court may be pleased to:
(a) direct the Respondent to pay maintenance of Rs. [__] per month to [EACH APPLICANT] from the date of this application;
(b) direct payment of interim maintenance of Rs. [__] per month and litigation expenses pending disposal; and
(c) grant such other relief as this Hon'ble Court deems fit.

${advocateBlock('APPLICANT(S)')}

${affidavitInSupport('APPLICANT', 'application')}`,
  },
  {
    id: 'fam-dv-act-12',
    title: 'Domestic violence application',
    category: 'Family & consumer',
    forum: 'Judicial Magistrate First Class / Metropolitan Magistrate',
    law: 'Section 12, Protection of Women from Domestic Violence Act, 2005; reliefs under Sections 18–22',
    use: 'Protection, residence, monetary relief, custody and compensation for an aggrieved woman.',
    facts: [
      'Aggrieved person and respondents (names, relationship, addresses)',
      'Domestic relationship and shared household',
      'Incidents of domestic violence (physical, sexual, verbal/emotional, economic) with dates',
      'Domestic Incident Report by the Protection Officer, if any',
      'Reliefs sought: protection, residence, monetary relief, custody, compensation',
      'Respondent\'s income (for monetary relief)',
    ],
    annexures: ['Domestic Incident Report, if prepared', 'Medical records / photographs', 'Police complaints', 'Proof of the shared household'],
    instructions:
      'The application is ordinarily made in Form II of the Protection of Women from Domestic Violence Rules, 2006 — follow its ' +
      'headings. Describe each incident with date and type of violence. Claim each relief under its own section: protection ' +
      'order (s.18), residence order (s.19), monetary relief (s.20), custody (s.21), compensation (s.22), and interim / ex parte ' +
      'orders (s.23) if urgent.',
    template: `IN THE COURT OF THE [JUDICIAL MAGISTRATE FIRST CLASS / METROPOLITAN MAGISTRATE] AT [PLACE]

CRIMINAL MISCELLANEOUS No. [____] of [YEAR]

[NAME OF AGGRIEVED PERSON], [AGE], residing at [ADDRESS] ... AGGRIEVED PERSON / APPLICANT

VERSUS

1. [RESPONDENT NAME, RELATIONSHIP, ADDRESS]
2. [RESPONDENT NAME, RELATIONSHIP, ADDRESS]
... RESPONDENTS

APPLICATION UNDER SECTION 12 OF THE PROTECTION OF WOMEN FROM DOMESTIC VIOLENCE ACT, 2005

The Applicant most respectfully submits as follows:

1. The Applicant is the [WIFE / RELATIONSHIP] of Respondent No. 1 and has been in a domestic relationship with the Respondents, living in the shared household at [ADDRESS] from [DATE] to [DATE].

2. INCIDENTS OF DOMESTIC VIOLENCE
(a) On [DATE], [INCIDENT] — [PHYSICAL / SEXUAL / VERBAL AND EMOTIONAL / ECONOMIC] abuse.
(b) On [DATE], [INCIDENT].

3. [DOMESTIC INCIDENT REPORT DATED [DATE] PREPARED BY THE PROTECTION OFFICER IS ANNEXED.]

4. The Applicant is in need of protection and the reliefs below.

PRAYER
5. The Applicant prays that this Hon'ble Court may be pleased to pass:
(a) a protection order under Section 18 restraining the Respondents from committing any act of domestic violence;
(b) a residence order under Section 19 [RESTRAINING THE RESPONDENTS FROM DISPOSSESSING THE APPLICANT FROM THE SHARED HOUSEHOLD / DIRECTING ALTERNATE ACCOMMODATION];
(c) monetary relief under Section 20 of Rs. [__] per month towards [MAINTENANCE, MEDICAL EXPENSES, LOSS OF EARNINGS];
(d) a custody order under Section 21 granting temporary custody of [CHILD];
(e) compensation under Section 22 of Rs. [__]; and
(f) interim and ex parte orders under Section 23 pending disposal.

${advocateBlock('APPLICANT')}

${affidavitInSupport('APPLICANT', 'application')}`,
  },
  {
    id: 'fam-child-custody',
    title: 'Child custody / guardianship petition',
    category: 'Family & consumer',
    forum: 'Family Court',
    law: 'Sections 7 & 25 Guardians and Wards Act, 1890; Section 6 Hindu Minority and Guardianship Act, 1956',
    use: 'Seeking custody or appointment as guardian of a minor child.',
    facts: [
      'Petitioner and Respondent and their relationship to the child',
      'Child: name, date of birth, school, where living now',
      'Why custody with the Petitioner is in the child\'s welfare',
      'Present custody arrangement and visitation',
      'Financial capacity and support system of the Petitioner',
    ],
    annexures: ['Birth certificate of the child', 'School records', 'Documents on the Petitioner\'s income and residence'],
    instructions:
      'The welfare of the child is the paramount consideration — build every ground around it (education, health, stability, ' +
      'emotional bonds, the child\'s wishes if old enough). Propose visitation for the other parent.',
    template: `IN THE COURT OF THE [PRINCIPAL JUDGE, FAMILY COURT] AT [PLACE]

G & W.C. No. [____] of [YEAR]

${partyBlock('PETITIONER')}

VERSUS

${partyBlock('RESPONDENT')}

PETITION UNDER SECTIONS 7 AND 25 OF THE GUARDIANS AND WARDS ACT, 1890, READ WITH SECTION 6 OF THE HINDU MINORITY AND GUARDIANSHIP ACT, 1956, FOR CUSTODY OF THE MINOR CHILD

The Petitioner most respectfully submits as follows:

1. [RELATIONSHIP BETWEEN THE PARTIES.]

2. The minor child, [NAME], was born on [DATE] and is presently residing with [__] at [ADDRESS].

3. [FACTS.]

4. The welfare of the minor lies in being in the custody of the Petitioner because:
(a) [EDUCATION AND STABILITY.]
(b) [HEALTH AND CARE.]
(c) [EMOTIONAL BOND AND SUPPORT SYSTEM.]

5. The Petitioner is willing to permit the Respondent reasonable visitation, as follows: [PROPOSAL].

6. The minor ordinarily resides within the jurisdiction of this Hon'ble Court.

PRAYER
7. The Petitioner prays that this Hon'ble Court may be pleased to appoint the Petitioner as guardian of the minor [NAME] and grant permanent custody of the minor to the Petitioner [, WITH INTERIM CUSTODY PENDING DISPOSAL].

${advocateBlock('PETITIONER')}

${verification('PETITIONER', 'petition')}`,
  },
  {
    id: 'consumer-complaint',
    title: 'Consumer complaint (District Commission)',
    category: 'Family & consumer',
    forum: 'District Consumer Disputes Redressal Commission (value up to Rs. 50 lakh)',
    law: 'Sections 34, 35, 38 & 39 Consumer Protection Act, 2019; limitation under Section 69',
    use: 'Complaint for defective goods, deficiency in service or unfair trade practice.',
    facts: [
      'Complainant (consumer) and opposite party (seller / service provider)',
      'Goods or service bought: date, price paid, invoice / receipt',
      'Defect / deficiency / unfair trade practice — what went wrong and when',
      'Complaints made to the opposite party and its response',
      'Loss suffered and compensation claimed',
      'Where the complainant resides or works (jurisdiction)',
    ],
    annexures: ['Invoice / receipt / policy', 'Warranty card', 'Correspondence and complaints with the opposite party', 'Legal notice, if sent', 'Evidence of the defect'],
    instructions:
      'Show the complainant is a "consumer" (bought for consideration, not for commercial resale). Specify the defect, deficiency ' +
      'or unfair trade practice. Pecuniary jurisdiction is by the value of consideration paid: District Commission up to Rs. 50 lakh, ' +
      'State Commission above that up to Rs. 2 crore, National Commission above Rs. 2 crore. A complaint may be filed where the ' +
      'complainant resides or personally works for gain (Section 34(2)). File within two years of the cause of action (Section 69). ' +
      'Claim reliefs under Section 39. The complaint may also be filed online (e-Daakhil).',
    template: `BEFORE THE DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION, [DISTRICT]

CONSUMER COMPLAINT No. [____] of [YEAR]

${partyBlock('COMPLAINANT')}

VERSUS

[NAME OF OPPOSITE PARTY], [CONSTITUTION, e.g. a company incorporated under the Companies Act], represented by its [DESIGNATION], having its office at [ADDRESS]
... OPPOSITE PARTY

COMPLAINT UNDER SECTION 35 OF THE CONSUMER PROTECTION ACT, 2019

The Complainant most respectfully submits as follows:

1. The Complainant is a consumer within the meaning of Section 2(7) of the Consumer Protection Act, 2019, having [PURCHASED / AVAILED] [GOODS / SERVICE] from the Opposite Party on [DATE] for a consideration of Rs. [__], under [INVOICE / RECEIPT NO.].

2. [FACTS — WHAT WAS PROMISED, WHAT HAPPENED, WITH DATES.]

3. The Complainant complained to the Opposite Party on [DATES / MODE]. [RESPONSE OR NO RESPONSE.]

4. The above acts amount to [A DEFECT IN GOODS / DEFICIENCY IN SERVICE / UNFAIR TRADE PRACTICE] within the meaning of Sections 2(10), 2(11) and 2(47) of the Act, as applicable.

5. The Complainant has suffered [LOSS, MENTAL AGONY, HARASSMENT], quantified as follows: [DETAILS].

JURISDICTION AND LIMITATION
6. The value of the goods / services paid as consideration is Rs. [__], within the pecuniary jurisdiction of this Commission. The Complainant [RESIDES / PERSONALLY WORKS FOR GAIN] at [PLACE], within the territorial jurisdiction of this Commission (Section 34(2)).

7. The cause of action arose on [DATE]. The complaint is filed within two years, as required by Section 69.

PRAYER
8. The Complainant prays that this Commission may be pleased to direct the Opposite Party to:
(a) [REPLACE THE GOODS / REFUND Rs. [__] / RENDER THE SERVICE PROPERLY];
(b) pay compensation of Rs. [__] for loss, mental agony and harassment;
(c) pay interest at [RATE]% per annum on the amount from [DATE];
(d) pay Rs. [__] towards the costs of this complaint; and
(e) grant such other relief as this Commission deems fit.

${advocateBlock('COMPLAINANT')}

${affidavitInSupport('COMPLAINANT', 'complaint')}

${listOfDocuments}`,
  },
];
