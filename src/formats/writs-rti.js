'use strict';

// Writ petitions (Article 226) and Right to Information formats.

const { advocateBlock, affidavitInSupport, partyBlock, listOfDocuments } = require('./common');

const WRIT_NOTES =
  'High Court writ practice: most High Courts require a SYNOPSIS and a LIST OF DATES AND EVENTS before the petition, ' +
  'then the petition with facts, the questions of law, numbered grounds, the averment that no other petition has been ' +
  'filed for the same relief, and the prayer (main relief and interim relief), supported by an affidavit. Name the ' +
  'State or authority correctly (e.g. "State of Karnataka, represented by its Principal Secretary, … Department"). ' +
  'Address maintainability: explain why any alternative remedy is not efficacious, and account for any delay. Follow ' +
  'the format and page rules of the particular High Court. Do not cite case law that is not in the material — leave ' +
  '[CITATION] placeholders.';

const RTI_NOTES =
  'RTI conventions: plain, specific requests numbered one by one; no reasons need be given (Section 6(2)); identify ' +
  'the period and the records; state how the fee was paid (Rs. 10 under the Central rules — State rules may differ; ' +
  'BPL applicants are exempt with proof). The PIO must reply within 30 days, or 48 hours where the information ' +
  'concerns the life or liberty of a person (Section 7(1)). A first appeal lies within 30 days to the First Appellate ' +
  'Authority (Section 19(1)); a second appeal within 90 days to the Central or State Information Commission ' +
  '(Section 19(3)).';

module.exports = [
  {
    id: 'writ-226',
    title: 'Writ petition (certiorari / mandamus)',
    category: 'Writs',
    forum: 'High Court (extraordinary original jurisdiction)',
    law: 'Article 226 of the Constitution of India',
    use: 'Challenging an order or action of the State or a public authority, or seeking a direction to perform a public duty.',
    facts: [
      'Petitioner(s): name, description, address',
      'Respondent authorities (exact designations and departments)',
      'The order or action under challenge (number, date, authority)',
      'Chronology of events (for the list of dates)',
      'Representations made and their result',
      'Why the action is illegal: lack of jurisdiction, violation of natural justice, arbitrariness, violation of rights',
      'Alternative remedy available, and why it is not efficacious',
      'Delay, if any, and the reason',
      'Interim relief needed and why',
    ],
    annexures: ['Impugned order (Annexure P-1)', 'Representations and replies', 'Other documents relied on, as numbered annexures'],
    instructions: WRIT_NOTES,
    template: `IN THE HIGH COURT OF [STATE] AT [PLACE]
(EXTRAORDINARY ORIGINAL JURISDICTION)

WRIT PETITION (CIVIL) No. [____] of [YEAR]

BETWEEN:

${partyBlock('PETITIONER')}

AND

1. [STATE OF [STATE] / UNION OF INDIA], represented by its [SECRETARY], [DEPARTMENT], [ADDRESS]
2. [AUTHORITY], [ADDRESS]
... RESPONDENTS

SYNOPSIS

[A SHORT SUMMARY OF THE CASE: WHO THE PETITIONER IS, WHAT WAS DONE, WHY IT IS ILLEGAL, AND WHAT IS SOUGHT.]

LIST OF DATES AND EVENTS

Date | Event
[DATE] | [EVENT]
[DATE] | [EVENT]

WRIT PETITION UNDER ARTICLE 226 OF THE CONSTITUTION OF INDIA PRAYING FOR A WRIT OF [CERTIORARI / MANDAMUS / OTHER] OR ANY OTHER APPROPRIATE WRIT, ORDER OR DIRECTION

The Petitioner most respectfully submits as follows:

1. [THE PETITIONER AND THE RESPONDENTS.]

2. [FACTS, IN ORDER, REFERRING TO ANNEXURES.]

3. The Respondent No. [__] passed the impugned order dated [DATE] (Annexure P-[__]), by which [WHAT WAS DONE].

QUESTIONS OF LAW
4. (a) [QUESTION.]
   (b) [QUESTION.]

GROUNDS
5. (a) The impugned order is without jurisdiction / authority of law. [REASONS.]
   (b) The impugned order was passed in violation of the principles of natural justice. [REASONS.]
   (c) The impugned action is arbitrary and violative of Article 14 of the Constitution. [REASONS.]
   (d) [FURTHER GROUNDS.]

6. The Petitioner has no other equally efficacious alternative remedy. [OR: WHY THE AVAILABLE REMEDY IS NOT EFFICACIOUS.]

7. [THERE IS NO DELAY / THE DELAY IS EXPLAINED AS FOLLOWS.]

8. The Petitioner has not filed any other petition seeking the same relief before this Hon'ble Court or the Supreme Court.

PRAYER
9. The Petitioner prays that this Hon'ble Court may be pleased to:
(a) issue a writ of certiorari or any other appropriate writ quashing the order dated [DATE] passed by Respondent No. [__] (Annexure P-[__]);
(b) issue a writ of mandamus directing the Respondents to [ACT];
(c) grant such other relief as this Hon'ble Court deems fit.

INTERIM PRAYER
10. Pending disposal of this petition, the Petitioner prays that this Hon'ble Court may be pleased to stay the operation of the order dated [DATE] / direct [INTERIM RELIEF].

${advocateBlock('PETITIONER')}

${affidavitInSupport('PETITIONER', 'writ petition')}

${listOfDocuments}`,
  },
  {
    id: 'writ-habeas-corpus',
    title: 'Writ of habeas corpus',
    category: 'Writs',
    forum: 'High Court',
    law: 'Article 226 of the Constitution of India; Articles 21 and 22',
    use: 'Securing the release of a person held in illegal detention, including challenges to preventive detention orders.',
    facts: [
      'Petitioner and their relationship to the detenu',
      'Detenu: name, age, address',
      'Who is detaining the detenu, where, and since when',
      'Detention order (number, date, authority, Act) if preventive detention',
      'Grounds of detention: date served, language, documents supplied',
      'Representation made against detention: date, to whom, whether and when decided',
      'Why the detention is illegal',
    ],
    annexures: ['Detention order and grounds', 'Representation and its acknowledgement', 'Documents showing the detention'],
    instructions:
      `${WRIT_NOTES} For preventive detention, examine the safeguards under Article 22(5): grounds and relied-on documents ` +
      'supplied in time and in a language the detenu understands, the opportunity to make a representation, and its ' +
      'prompt consideration. State the facts on each with dates; leave dates not in the material as [TO CONFIRM].',
    template: `IN THE HIGH COURT OF [STATE] AT [PLACE]

WRIT PETITION (HABEAS CORPUS) No. [____] of [YEAR]

BETWEEN:

${partyBlock('PETITIONER')}
(on behalf of [DETENU NAME], the detenu, who is the [RELATIONSHIP] of the Petitioner)

AND

1. State of [STATE], represented by its [SECRETARY], [HOME / OTHER] Department
2. [DETAINING AUTHORITY]
3. [SUPERINTENDENT, PRISON / STATION HOUSE OFFICER]
... RESPONDENTS

WRIT PETITION UNDER ARTICLE 226 OF THE CONSTITUTION OF INDIA PRAYING FOR A WRIT OF HABEAS CORPUS

The Petitioner most respectfully submits as follows:

1. The detenu, [NAME], aged [AGE], residing at [ADDRESS], is the [RELATIONSHIP] of the Petitioner and is presently detained at [PLACE] by Respondent No. [__] since [DATE].

2. [FACTS OF THE DETENTION. IF PREVENTIVE DETENTION: ORDER NO. [__] DATED [DATE] UNDER SECTION [__] OF THE [ACT], SERVED ON [DATE]; GROUNDS SUPPLIED ON [DATE].]

3. The detenu made a representation dated [DATE] to [AUTHORITY]. [IT HAS NOT BEEN CONSIDERED / IT WAS REJECTED ON [DATE].]

GROUNDS
4. (a) The detention is illegal and violates Articles 21 and 22 of the Constitution. [REASONS.]
   (b) [THE DOCUMENTS RELIED ON WERE NOT SUPPLIED / NOT SUPPLIED IN A LANGUAGE THE DETENU UNDERSTANDS.]
   (c) [THE REPRESENTATION WAS NOT CONSIDERED WITH PROMPTITUDE.]
   (d) [THE DETAINING AUTHORITY DID NOT APPLY ITS MIND / THE GROUNDS ARE VAGUE OR STALE.]

5. No other petition seeking the same relief has been filed before this Hon'ble Court or the Supreme Court.

PRAYER
6. The Petitioner prays that this Hon'ble Court may be pleased to issue a writ of habeas corpus directing the Respondents to produce the detenu, [NAME], before this Hon'ble Court and set the detenu at liberty forthwith, [AND QUASH THE DETENTION ORDER NO. [__] DATED [DATE]].

${advocateBlock('PETITIONER')}

${affidavitInSupport('PETITIONER', 'writ petition')}`,
  },
  {
    id: 'rti-application',
    title: 'RTI application',
    category: 'RTI',
    forum: 'Public Information Officer of the public authority',
    law: 'Section 6(1), Right to Information Act, 2005',
    use: 'Requesting information or records from a public authority.',
    facts: [
      'Applicant: name, address, phone / email (must be a citizen of India)',
      'Public authority and its address (PIO)',
      'The information or records sought, item by item',
      'Period the information relates to',
      'Fee: amount and mode of payment, or BPL status',
      'Whether the information concerns life or liberty (48-hour reply)',
    ],
    annexures: ['Proof of fee payment (IPO / DD / receipt)', 'BPL card copy, if claiming exemption'],
    instructions: RTI_NOTES,
    template: `To,
The Public Information Officer,
[NAME OF PUBLIC AUTHORITY]
[ADDRESS]

Sub: Application under Section 6(1) of the Right to Information Act, 2005

Sir / Madam,

1. Name of the applicant: [NAME]
2. Address: [ADDRESS]
3. Phone / Email: [__]
4. I am a citizen of India.

5. Particulars of the information sought:
   (a) [INFORMATION / CERTIFIED COPY OF RECORD]
   (b) [INFORMATION]
   (c) [INFORMATION]

6. Period to which the information relates: [FROM — TO]

7. The application fee of Rs. [10] has been paid by [INDIAN POSTAL ORDER NO. [__] / DEMAND DRAFT NO. [__] / ONLINE RECEIPT NO. [__]]. [OR: I AM A BELOW POVERTY LINE CARD HOLDER — COPY ENCLOSED.]

8. I request that the information be provided [BY POST TO THE ABOVE ADDRESS / BY EMAIL / IN CERTIFIED COPIES]. I am willing to pay any further fee as prescribed.

[9. The information sought concerns the life or liberty of [PERSON] and is requested within 48 hours under the proviso to Section 7(1).]

Place: [PLACE]
Date: [DATE]

[SIGNATURE]
[NAME OF APPLICANT]`,
  },
  {
    id: 'rti-first-appeal',
    title: 'RTI first appeal',
    category: 'RTI',
    forum: 'First Appellate Authority of the public authority',
    law: 'Section 19(1), Right to Information Act, 2005',
    use: 'Appeal when the PIO refuses, gives incomplete information, or does not reply in time.',
    facts: [
      'Appellant details',
      'RTI application: date, registration number, PIO addressed',
      "PIO's reply: date and gist (or no reply by the due date)",
      'What was refused or not supplied, and why that is wrong',
    ],
    annexures: ['Copy of the RTI application', 'Proof of fee payment', "Copy of the PIO's reply, if any"],
    instructions:
      `${RTI_NOTES} The first appeal lies within 30 days of the reply, or of the date by which the reply was due. Where the ` +
      'PIO failed to reply in time, the information must be provided free of charge (Section 7(6)) — ask for that.',
    template: `To,
The First Appellate Authority,
[NAME OF PUBLIC AUTHORITY]
[ADDRESS]

Sub: First appeal under Section 19(1) of the Right to Information Act, 2005

1. Name and address of the appellant: [NAME, ADDRESS, PHONE / EMAIL]
2. Name and address of the Public Information Officer: [__]
3. Date of the RTI application and registration no.: [DATE, NO.]
4. Date of the PIO's reply: [DATE / NO REPLY RECEIVED WITHIN 30 DAYS]
5. Last date for filing this appeal: [DATE]

6. Grounds of appeal:
   (a) [THE PIO DID NOT REPLY WITHIN THE TIME LIMIT IN SECTION 7(1).]
   (b) [THE INFORMATION AT ITEM [__] WAS WRONGLY REFUSED UNDER SECTION [__]. REASONS.]
   (c) [THE INFORMATION SUPPLIED IS INCOMPLETE / MISLEADING. PARTICULARS.]

7. Relief sought:
   (a) direct the PIO to provide the complete information sought at items [__], free of cost under Section 7(6), within [__] days;
   (b) [ANY OTHER RELIEF].

Place: [PLACE]
Date: [DATE]

[SIGNATURE]
[NAME OF APPELLANT]`,
  },
  {
    id: 'rti-second-appeal',
    title: 'RTI second appeal (Information Commission)',
    category: 'RTI',
    forum: 'Central Information Commission / State Information Commission',
    law: 'Section 19(3), Right to Information Act, 2005; Sections 18, 19(8) and 20',
    use: 'Appeal against the First Appellate Authority\'s decision, or its failure to decide.',
    facts: [
      'Appellant details',
      'Public authority, PIO and First Appellate Authority',
      'RTI application, PIO reply, first appeal and its decision — with dates',
      'Information still not supplied and why it must be',
      'Whether penalty on the PIO and compensation are sought',
    ],
    annexures: ['RTI application', "PIO's reply", 'First appeal', "First Appellate Authority's order", 'Proof of fee payment'],
    instructions:
      `${RTI_NOTES} The second appeal lies within 90 days of the date the first appeal was decided or should have been ` +
      'decided. Follow the contents prescribed by the Commission\'s rules (for the CIC, the RTI Rules, 2012). The Commission ' +
      'may direct disclosure, award compensation (Section 19(8)(b)) and impose a penalty on the PIO (Section 20).',
    template: `BEFORE THE [CENTRAL / STATE] INFORMATION COMMISSION
[ADDRESS]

SECOND APPEAL UNDER SECTION 19(3) OF THE RIGHT TO INFORMATION ACT, 2005

1. Name and address of the appellant: [NAME, ADDRESS, PHONE / EMAIL]
2. Name and address of the Public Information Officer: [__]
3. Name and address of the First Appellate Authority: [__]
4. Particulars of the RTI application: dated [DATE], registration no. [__]
5. PIO's reply: [DATE / NOT RECEIVED]
6. First appeal: filed on [DATE]; decided on [DATE] / not decided
7. Brief facts:
   [FACTS.]
8. Grounds of second appeal:
   (a) [GROUND.]
   (b) [GROUND.]
9. Prayer:
   (a) direct the PIO to furnish the information sought at items [__], free of cost;
   (b) impose a penalty on the PIO under Section 20 for [DELAY / REFUSAL WITHOUT REASONABLE CAUSE];
   (c) award compensation to the appellant under Section 19(8)(b) for the loss and detriment suffered;
   (d) any other order the Commission deems fit.

10. I declare that the matter has not been decided by the Commission earlier and is not pending before any court.

Place: [PLACE]
Date: [DATE]

[SIGNATURE]
[NAME OF APPELLANT]

${listOfDocuments}`,
  },
];
