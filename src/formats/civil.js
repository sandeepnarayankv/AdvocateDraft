'use strict';

// Civil (Code of Civil Procedure, 1908) formats.

const { advocateBlock, verification, affidavitInSupport, partyBlock, listOfDocuments } = require('./common');

const civilCause = (court, caseType) => `IN THE COURT OF THE ${court} AT [PLACE]

${caseType} No. [____] of [YEAR]

BETWEEN:

${partyBlock('PLAINTIFF')}

AND

${partyBlock('DEFENDANT')}`;

const PLEADING_NOTES =
  'Indian civil pleading conventions: cause title, short numbered paragraphs, facts in chronological order, ' +
  'separate paragraphs for cause of action, jurisdiction, limitation, and valuation & court fee, then the prayer. ' +
  'Cite only provisions stated here or in the material. Court fee and valuation follow the State Court Fees and ' +
  'Suits Valuation Act — leave the figures as [TO CONFIRM] if not given. In a commercial suit (Commercial Courts ' +
  'Act, 2015) add a Statement of Truth under Order VI Rule 15A instead of the ordinary verification.';

module.exports = [
  {
    id: 'civil-plaint-money',
    title: 'Plaint — suit for recovery of money',
    category: 'Civil',
    forum: 'Civil Judge / City Civil Court (by pecuniary value)',
    law: 'Order VII Rule 1 & Section 26 CPC; Order VI Rule 15 (verification); Order VII Rule 14 (documents)',
    use: 'Recovering a debt, unpaid price, loan or other ascertained sum with interest.',
    facts: [
      'Plaintiff (name, age, occupation, address)',
      'Defendant (name, age, occupation, address)',
      'Relationship / transaction between the parties',
      'Amount due and how it is calculated (principal, interest rate, period)',
      'Dates of payment, invoices or agreement',
      'Demands made and legal notice sent (date, reply if any)',
      'Date the cause of action arose',
      'Where the defendant resides / where the cause of action arose (jurisdiction)',
      'Court fee and valuation (if known)',
    ],
    annexures: ['Agreement / invoices / ledger', 'Proof of payment', 'Legal notice, postal receipts and acknowledgement', 'Reply, if any'],
    instructions: PLEADING_NOTES,
    template: `${civilCause('[PRINCIPAL CIVIL JUDGE / CITY CIVIL JUDGE]', 'ORIGINAL SUIT')}

PLAINT UNDER ORDER VII RULE 1 READ WITH SECTION 26 OF THE CODE OF CIVIL PROCEDURE, 1908, FOR RECOVERY OF RS. [AMOUNT] WITH INTEREST

The Plaintiff above named most respectfully submits as follows:

1. The Plaintiff is [DESCRIPTION OF PLAINTIFF]. The address of the Plaintiff for service of summons and notices is as stated in the cause title above.

2. The Defendant is [DESCRIPTION OF DEFENDANT]. The address of the Defendant for service of summons is as stated in the cause title above.

3. [FACTS OF THE TRANSACTION IN CHRONOLOGICAL ORDER — ONE FACT PER PARAGRAPH.]

4. The Defendant has failed to pay the sum of Rs. [AMOUNT] despite repeated demands. The Plaintiff caused a legal notice dated [DATE] to be issued to the Defendant, which was [SERVED ON / RETURNED] [DATE]. [THE DEFENDANT DID NOT REPLY / REPLIED ON [DATE] DENYING LIABILITY.]

5. The Plaintiff is entitled to recover Rs. [PRINCIPAL] together with interest at [RATE]% per annum from [DATE] till the date of suit, amounting to Rs. [INTEREST], totalling Rs. [TOTAL], as detailed below:
(a) Principal: Rs. [__]
(b) Interest from [DATE] to [DATE] at [RATE]%: Rs. [__]
Total: Rs. [__]

CAUSE OF ACTION
6. The cause of action for this suit arose on [DATE], when [EVENT], and on [DATE], when the Defendant failed to comply with the legal notice, and it continues.

JURISDICTION
7. This Hon'ble Court has territorial jurisdiction as [THE DEFENDANT RESIDES / CARRIES ON BUSINESS / THE CAUSE OF ACTION AROSE] within its limits (Section 20 CPC), and pecuniary jurisdiction as the suit is valued at Rs. [__].

LIMITATION
8. The suit is within the period of limitation prescribed under the Limitation Act, 1963, as [REASON].

VALUATION AND COURT FEE
9. The suit is valued at Rs. [__] for the purposes of jurisdiction and court fee, and court fee of Rs. [__] is paid under the [STATE] Court Fees and Suits Valuation Act.

PRAYER
10. The Plaintiff therefore prays that this Hon'ble Court may be pleased to:
(a) pass a decree directing the Defendant to pay the Plaintiff Rs. [TOTAL];
(b) award pendente lite and future interest at [RATE]% per annum from the date of suit till realisation;
(c) award the costs of the suit; and
(d) grant such other relief as this Hon'ble Court deems fit in the circumstances of the case.

${advocateBlock('PLAINTIFF')}

${verification('PLAINTIFF', 'plaint')}

${affidavitInSupport('PLAINTIFF', 'plaint')}

${listOfDocuments}`,
  },
  {
    id: 'civil-plaint-injunction',
    title: 'Plaint — declaration and permanent injunction',
    category: 'Civil',
    forum: 'Civil Judge (by valuation)',
    law: 'Sections 34 & 38 Specific Relief Act, 1963; Order VII Rule 1 & Section 26 CPC',
    use: 'Protecting possession or a right in property, or declaring title, and restraining interference.',
    facts: [
      'Plaintiff and Defendant (names, ages, addresses)',
      'Schedule property: survey / khata / door number, extent, boundaries (N/S/E/W)',
      'How the Plaintiff acquired title / possession (deed, date, registration details)',
      'What the Defendant did or threatens to do, and when',
      'Police complaints or earlier proceedings, if any',
      'Relief sought: declaration, permanent injunction, or both',
      'Valuation and court fee (if known)',
    ],
    annexures: ['Title deed', 'Mutation / khata / RTC extracts', 'Tax receipts', 'Photographs', 'Police complaint, if any'],
    instructions: `${PLEADING_NOTES} Describe the property precisely in a SCHEDULE at the end. Plead the Plaintiff's lawful possession and the specific acts of interference.`,
    template: `${civilCause('[CIVIL JUDGE (SENIOR / JUNIOR DIVISION)]', 'ORIGINAL SUIT')}

PLAINT UNDER ORDER VII RULE 1 READ WITH SECTION 26 OF THE CODE OF CIVIL PROCEDURE, 1908, AND SECTIONS 34 AND 38 OF THE SPECIFIC RELIEF ACT, 1963, FOR DECLARATION AND PERMANENT INJUNCTION

The Plaintiff above named most respectfully submits as follows:

1. [DESCRIPTION OF THE PARTIES.]

2. The Plaintiff is the absolute owner in lawful possession and enjoyment of the property more fully described in the Schedule below ("the Schedule Property"), having acquired it under [DEED] dated [DATE], registered as Document No. [__] in the office of the Sub-Registrar, [PLACE].

3. [HOW TITLE AND POSSESSION HAVE BEEN EXERCISED — KHATA, TAXES, OCCUPATION.]

4. The Defendant has no right, title or interest in the Schedule Property. On [DATE] the Defendant [ACTS OF INTERFERENCE / THREAT].

5. [POLICE COMPLAINT / OTHER STEPS TAKEN.]

6. Unless restrained, the Defendant will [APPREHENDED INJURY], causing irreparable loss to the Plaintiff which cannot be compensated in money.

CAUSE OF ACTION
7. The cause of action arose on [DATE] when [EVENT], and is continuing.

JURISDICTION
8. The Schedule Property is situated within the jurisdiction of this Hon'ble Court (Section 16 CPC).

LIMITATION
9. The suit is within time.

VALUATION AND COURT FEE
10. The suit is valued at Rs. [__] for declaration and Rs. [__] for injunction under Section [__] of the [STATE] Court Fees and Suits Valuation Act, and court fee of Rs. [__] is paid.

PRAYER
11. The Plaintiff prays that this Hon'ble Court may be pleased to:
(a) declare that the Plaintiff is the absolute owner of the Schedule Property;
(b) pass a decree of permanent injunction restraining the Defendant, his agents and anyone claiming through him from interfering with the Plaintiff's peaceful possession and enjoyment of the Schedule Property;
(c) award costs; and
(d) grant such other relief as this Hon'ble Court deems fit.

SCHEDULE PROPERTY
All that piece and parcel of [DESCRIPTION], bearing [SURVEY / KHATA / DOOR NO.], measuring [EXTENT], situated at [VILLAGE / WARD, TALUK, DISTRICT], bounded on the:
North by: [__]
South by: [__]
East by: [__]
West by: [__]

${advocateBlock('PLAINTIFF')}

${verification('PLAINTIFF', 'plaint')}

${affidavitInSupport('PLAINTIFF', 'plaint')}

${listOfDocuments}`,
  },
  {
    id: 'civil-written-statement',
    title: 'Written statement (defence to a plaint)',
    category: 'Civil',
    forum: 'The court where the suit is pending',
    law: 'Order VIII Rules 1, 3, 4, 5, 6 & 6A CPC',
    use: "The Defendant's reply to a plaint, including any set-off or counter-claim.",
    facts: [
      'Suit number, court, and the parties',
      'Date of service of summons (for the filing deadline)',
      "Defendant's version of the facts",
      'Paragraph-wise admissions and denials of the plaint',
      'Preliminary objections (jurisdiction, limitation, valuation, non-joinder, bar of suit)',
      'Set-off or counter-claim, if any',
    ],
    annexures: ['Documents relied on by the Defendant'],
    instructions:
      `${PLEADING_NOTES} Deny specifically (Order VIII Rule 3–5): an evasive or general denial is treated as an admission. ` +
      'Go through the plaint paragraph by paragraph. Note the deadline: 30 days from service, extendable up to 90 days ' +
      '(120 days and no further in commercial suits).',
    template: `IN THE COURT OF THE [COURT] AT [PLACE]

ORIGINAL SUIT No. [____] of [YEAR]

[PLAINTIFF NAME] ... PLAINTIFF
VERSUS
[DEFENDANT NAME] ... DEFENDANT

WRITTEN STATEMENT FILED BY THE DEFENDANT UNDER ORDER VIII RULE 1 OF THE CODE OF CIVIL PROCEDURE, 1908

The Defendant above named most respectfully submits as follows:

PRELIMINARY OBJECTIONS
1. The suit is not maintainable in law or on facts. [GROUNDS — e.g. LACK OF JURISDICTION, LIMITATION, IMPROPER VALUATION, NON-JOINDER, BAR UNDER ANY LAW.]

2. The Plaintiff has not approached this Hon'ble Court with clean hands and has suppressed [MATERIAL FACTS].

REPLY ON MERITS (PARAGRAPH-WISE)
3. The averments in paragraph 1 of the plaint are [ADMITTED / DENIED / NOT ADMITTED AS STATED]. [SPECIFIC REPLY.]

4. The averments in paragraph 2 of the plaint are [__]. [SPECIFIC REPLY.]

[CONTINUE FOR EACH PARAGRAPH OF THE PLAINT.]

ADDITIONAL PLEAS
5. [THE DEFENDANT'S OWN VERSION OF THE FACTS.]

[SET-OFF / COUNTER-CLAIM UNDER ORDER VIII RULE 6 / 6A, IF ANY, WITH VALUATION AND COURT FEE.]

PRAYER
6. The Defendant therefore prays that this Hon'ble Court may be pleased to dismiss the suit with exemplary costs [AND DECREE THE COUNTER-CLAIM AS PRAYED], in the interest of justice.

${advocateBlock('DEFENDANT')}

${verification('DEFENDANT', 'written statement')}

${affidavitInSupport('DEFENDANT', 'written statement')}

${listOfDocuments}`,
  },
  {
    id: 'civil-temporary-injunction',
    title: 'Application for temporary injunction',
    category: 'Civil',
    forum: 'The court where the suit is pending (filed with the plaint or later)',
    law: 'Order XXXIX Rules 1 & 2 read with Section 151 CPC',
    use: 'Interim protection of property or rights while the suit is decided.',
    facts: [
      'Suit number and parties',
      'The right or possession to be protected',
      'Threatened act and its urgency',
      'Why there is a prima facie case',
      'Why the balance of convenience favours the applicant',
      'The irreparable injury if not granted',
      'Whether an ex parte order is needed and why (Order XXXIX Rule 3)',
    ],
    annexures: ['Documents showing title / possession', 'Photographs or evidence of the threat'],
    instructions:
      'Structure the grounds around the three tests: prima facie case, balance of convenience, irreparable injury. ' +
      'If ex parte relief is sought, state why notice would defeat the purpose (Order XXXIX Rule 3). Include a supporting affidavit.',
    template: `IN THE COURT OF THE [COURT] AT [PLACE]

I.A. No. [____] of [YEAR]
IN
ORIGINAL SUIT No. [____] of [YEAR]

[PLAINTIFF NAME] ... PLAINTIFF / APPLICANT
VERSUS
[DEFENDANT NAME] ... DEFENDANT / RESPONDENT

APPLICATION UNDER ORDER XXXIX RULES 1 AND 2 READ WITH SECTION 151 OF THE CODE OF CIVIL PROCEDURE, 1908

The Applicant / Plaintiff most respectfully submits as follows:

1. The Applicant has filed the above suit for [RELIEF]. The contents of the plaint may be read as part of this application.

2. [THE RIGHT / POSSESSION TO BE PROTECTED.]

3. [THE THREATENED ACT AND ITS URGENCY.]

GROUNDS
4. Prima facie case: [REASONS].
5. Balance of convenience: [REASONS].
6. Irreparable injury: [REASONS]. Loss of this kind cannot be compensated in money.

7. [IF EX PARTE RELIEF IS SOUGHT: WHY GIVING NOTICE WOULD DEFEAT THE PURPOSE OF THE INJUNCTION.]

PRAYER
8. The Applicant prays that this Hon'ble Court may be pleased to grant a temporary injunction restraining the Respondent, his agents and anyone claiming through him from [ACT], pending disposal of the suit, [AND PASS AN AD-INTERIM EX PARTE ORDER IN THE SAME TERMS], in the interest of justice.

${advocateBlock('APPLICANT')}

${affidavitInSupport('APPLICANT', 'application')}`,
  },
  {
    id: 'civil-summary-suit',
    title: 'Summary suit (Order XXXVII)',
    category: 'Civil',
    forum: 'High Court, City Civil Court, Commercial Court or court notified for Order XXXVII',
    law: 'Order XXXVII CPC; Commercial Courts Act, 2015 where applicable',
    use: 'Fast recovery of a debt or liquidated sum on a written contract, bill of exchange, promissory note or cheque.',
    facts: [
      'Plaintiff and Defendant',
      'Written contract / bill / cheque / promissory note relied on (date, amount)',
      'Exact liquidated sum claimed and interest',
      'Demands and legal notice',
      'Whether this is a commercial dispute (and its specified value)',
    ],
    annexures: ['The written contract / instrument', 'Invoices and statement of account', 'Legal notice and proof of service'],
    instructions:
      `${PLEADING_NOTES} The title must state that the suit is filed under Order XXXVII. Include the specific averment required by ` +
      'Order XXXVII Rule 2(1): that no relief outside the scope of the Order has been claimed. Claim only a debt or liquidated demand.',
    template: `IN THE COURT OF THE [COURT] AT [PLACE]

SUMMARY SUIT No. [____] of [YEAR]

${partyBlock('PLAINTIFF')}

VERSUS

${partyBlock('DEFENDANT')}

SUMMARY SUIT UNDER ORDER XXXVII OF THE CODE OF CIVIL PROCEDURE, 1908, FOR RECOVERY OF RS. [AMOUNT]

The Plaintiff most respectfully submits as follows:

1. [DESCRIPTION OF THE PARTIES.]

2. The suit is based on [WRITTEN CONTRACT / BILL OF EXCHANGE / PROMISSORY NOTE / CHEQUE] dated [DATE] for a debt / liquidated demand of Rs. [AMOUNT].

3. [FACTS SHOWING THE LIQUIDATED SUM DUE.]

4. The amount due as on the date of suit is Rs. [__], with interest at [RATE]% per annum from [DATE].

5. No relief has been claimed in this suit which does not fall within the ambit of Order XXXVII of the Code of Civil Procedure, 1908.

6. Cause of action: [DATES]. Jurisdiction: [GROUNDS]. Limitation: [__]. Valuation and court fee: [__].

PRAYER
7. The Plaintiff prays for a decree for Rs. [__] with interest at [RATE]% per annum from [DATE] till realisation, and costs.

${advocateBlock('PLAINTIFF')}

${verification('PLAINTIFF', 'plaint')}

${listOfDocuments}`,
  },
  {
    id: 'civil-execution',
    title: 'Execution petition',
    category: 'Civil',
    forum: 'The court that passed the decree (or to which it is transferred)',
    law: 'Order XXI Rule 11(2) CPC',
    use: 'Enforcing a decree: money decree, possession, injunction.',
    facts: [
      'Original suit number, court, and date of decree',
      'Decree-holder and judgment-debtor',
      'Whether an appeal was filed against the decree',
      'Payments or adjustments made after the decree',
      'Earlier execution applications, if any',
      'Amount due with interest and costs, or other relief to be enforced',
      'Mode of execution sought (attachment, arrest, delivery of possession …)',
      'Properties to be attached, if any',
    ],
    annexures: ['Certified copy of the decree and judgment'],
    instructions: 'Use the tabular particulars required by Order XXI Rule 11(2). Keep every column; mark unknown values [TO CONFIRM].',
    template: `IN THE COURT OF THE [COURT] AT [PLACE]

EXECUTION PETITION No. [____] of [YEAR]
IN
ORIGINAL SUIT No. [____] of [YEAR]

[DECREE-HOLDER NAME] ... DECREE-HOLDER
VERSUS
[JUDGMENT-DEBTOR NAME] ... JUDGMENT-DEBTOR

EXECUTION PETITION UNDER ORDER XXI RULE 11(2) OF THE CODE OF CIVIL PROCEDURE, 1908

The Decree-Holder prays for execution of the decree, the particulars of which are as follows:

1. Number of the suit: O.S. No. [__] of [YEAR]
2. Names of the parties: [__]
3. Date of the decree: [__]
4. Whether any appeal was preferred from the decree: [NO / YES — PARTICULARS]
5. Payment or adjustment made, if any: [__]
6. Previous applications for execution, with dates and results: [__]
7. Amount with interest due under the decree, or other relief granted: [__]
8. Amount of costs, if any awarded: [__]
9. Name of the person against whom execution is sought: [__]
10. Mode in which the assistance of the Court is required: [ATTACHMENT AND SALE OF THE PROPERTY IN THE SCHEDULE / ARREST AND DETENTION / DELIVERY OF POSSESSION / OTHER]

PRAYER
The Decree-Holder prays that the decree be executed in the manner stated above and the amount due with costs of execution be recovered.

SCHEDULE OF PROPERTY (IF ATTACHMENT IS SOUGHT)
[DESCRIPTION]

${advocateBlock('DECREE-HOLDER')}

${verification('DECREE-HOLDER', 'execution petition')}`,
  },
  {
    id: 'civil-first-appeal',
    title: 'Regular first appeal (memorandum of appeal)',
    category: 'Civil',
    forum: 'District Court or High Court (depending on valuation)',
    law: 'Section 96 & Order XLI Rule 1 CPC',
    use: 'Appealing an original decree of a civil court.',
    facts: [
      'Lower court, suit number, date of judgment and decree',
      'Appellant and Respondent (their positions in the suit)',
      'What the trial court decided',
      'Errors of fact and law in the judgment',
      'Date of applying for and receiving the certified copy (for limitation)',
      'Interim relief needed (stay of the decree), if any',
    ],
    annexures: ['Certified copy of the judgment and decree', 'Copies of pleadings and evidence relied on'],
    instructions:
      'Set out concise numbered GROUNDS of appeal, each a distinct error of fact or law, without argument or narrative (Order XLI Rule 1(2)). ' +
      'Limitation: 90 days to the High Court, 30 days to any other court (Article 116, Limitation Act), excluding time to obtain certified copies.',
    template: `IN THE [HIGH COURT OF [STATE] AT [PLACE] / COURT OF THE DISTRICT JUDGE AT [PLACE]]

REGULAR FIRST APPEAL No. [____] of [YEAR]

[NAME] ... APPELLANT
([PLAINTIFF / DEFENDANT] IN THE SUIT)
VERSUS
[NAME] ... RESPONDENT
([PLAINTIFF / DEFENDANT] IN THE SUIT)

MEMORANDUM OF REGULAR FIRST APPEAL UNDER SECTION 96 READ WITH ORDER XLI RULE 1 OF THE CODE OF CIVIL PROCEDURE, 1908

The Appellant above named prefers this appeal against the judgment and decree dated [DATE] passed by the [COURT] in O.S. No. [__] of [YEAR], on the following among other grounds:

FACTS IN BRIEF
1. [BRIEF HISTORY OF THE SUIT AND WHAT THE TRIAL COURT DECIDED.]

GROUNDS
2. The judgment and decree of the trial court are contrary to law, the weight of evidence and the probabilities of the case.
3. The trial court erred in [SPECIFIC ERROR].
4. The trial court failed to consider [EVIDENCE / LEGAL POSITION].
[ONE NUMBERED GROUND PER ERROR.]

5. The Appellant craves leave to urge additional grounds at the time of hearing.

LIMITATION
6. The appeal is filed within time. The judgment was pronounced on [DATE]; the certified copy was applied for on [DATE] and received on [DATE].

VALUATION AND COURT FEE
7. The appeal is valued at Rs. [__] and court fee of Rs. [__] is paid.

PRAYER
8. The Appellant prays that this Hon'ble Court may be pleased to set aside the judgment and decree dated [DATE] in O.S. No. [__] of [YEAR] and [DECREE / DISMISS] the suit, with costs throughout.

${advocateBlock('APPELLANT')}`,
  },
  {
    id: 'civil-condonation-delay',
    title: 'Application for condonation of delay',
    category: 'Civil',
    forum: 'The court where the appeal / application is filed',
    law: 'Section 5, Limitation Act, 1963 (read with Section 151 CPC)',
    use: 'Explaining delay in filing an appeal or application.',
    facts: [
      'Main case to which the delay relates',
      'Last date for filing and actual filing date (days of delay)',
      'Day-by-day reasons for the delay',
      'Supporting documents (medical records etc.)',
    ],
    annexures: ['Documents proving the cause of delay (medical certificates etc.)'],
    instructions:
      'Explain the entire period of delay with specific dates; courts expect each period to be accounted for. Show the delay was ' +
      'bona fide and not deliberate. Include a supporting affidavit.',
    template: `IN THE [COURT] AT [PLACE]

I.A. No. [____] of [YEAR]
IN
[APPEAL / CASE] No. [____] of [YEAR]

[NAME] ... APPLICANT / APPELLANT
VERSUS
[NAME] ... RESPONDENT

APPLICATION UNDER SECTION 5 OF THE LIMITATION ACT, 1963, FOR CONDONATION OF DELAY OF [NUMBER] DAYS IN FILING THE [APPEAL / APPLICATION]

The Applicant most respectfully submits as follows:

1. The [APPEAL] is directed against the [ORDER / JUDGMENT] dated [DATE] in [CASE].

2. The period of limitation expired on [DATE]. The [APPEAL] is filed on [DATE], with a delay of [NUMBER] days.

3. The delay was caused as follows:
(a) From [DATE] to [DATE]: [REASON]
(b) From [DATE] to [DATE]: [REASON]

4. The delay is neither wilful nor deliberate. The Applicant has a good case on merits and will suffer grave prejudice if the delay is not condoned, whereas no prejudice will be caused to the Respondent.

PRAYER
5. The Applicant prays that this Hon'ble Court may be pleased to condone the delay of [NUMBER] days in filing the [APPEAL], in the interest of justice.

${advocateBlock('APPLICANT')}

${affidavitInSupport('APPLICANT', 'application')}`,
  },
  {
    id: 'civil-caveat',
    title: 'Caveat petition',
    category: 'Civil',
    forum: 'The court where an application or appeal is expected',
    law: 'Section 148A CPC',
    use: 'Ensuring you are heard before any interim order is passed against your client.',
    facts: [
      'Caveator (your client) and the expected applicant',
      'The case or order from which an application / appeal is expected',
      'Court in which it is expected to be filed',
    ],
    annexures: ['Proof of service of the caveat on the expected applicant'],
    instructions:
      'A caveat remains in force for 90 days from filing (Section 148A(5)). The caveator must serve notice of the caveat on the ' +
      'expected applicant by registered post (Section 148A(3)) — state that this has been done.',
    template: `IN THE [COURT] AT [PLACE]

CAVEAT PETITION No. [____] of [YEAR]

${partyBlock('CAVEATOR')}

VERSUS

${partyBlock('EXPECTED APPLICANT / RESPONDENT')}

CAVEAT UNDER SECTION 148A OF THE CODE OF CIVIL PROCEDURE, 1908

The Caveator above named states as follows:

1. The Caveator is the [PLAINTIFF / DEFENDANT / RESPONDENT] in [CASE NO.] before the [COURT], in which [ORDER / JUDGMENT] was passed on [DATE].

2. The Caveator apprehends that the Respondent may file [AN APPEAL / APPLICATION] before this Hon'ble Court seeking [INTERIM RELIEF].

3. The Caveator prays that no order be passed in any such application or appeal without notice to the Caveator and without hearing the Caveator.

4. A copy of this caveat has been sent to the Respondent by registered post with acknowledgement due on [DATE].

${advocateBlock('CAVEATOR')}`,
  },
];
