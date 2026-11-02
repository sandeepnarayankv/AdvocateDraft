'use strict';

// Motor accident compensation claims before the Motor Accidents Claims Tribunal.

const { advocateBlock, verification, listOfDocuments } = require('./common');

const MACT_NOTES =
  'MACT claim conventions: use the claim form prescribed by the State Motor Vehicles Rules if one exists; otherwise a ' +
  'petition with numbered particulars. Join the driver, the owner and the insurer of each offending vehicle. Give the ' +
  'policy number and validity. Plead negligence with specifics (speed, wrong side, signal). Quantify each head of ' +
  'compensation separately; compute loss of income / dependency using the multiplier method and settled principles, ' +
  'but cite judgments only if they are in the material (leave [CITATION]). Jurisdiction (Section 166(2)): the Tribunal ' +
  'where the accident occurred, where the claimant resides or carries on business, or where the defendant resides. ' +
  'Limitation: Section 166(3) (from 1 April 2022) requires a claim within six months of the accident, but the Supreme ' +
  'Court stayed its operation and directed that claims not be dismissed as time-barred while the challenge is pending — ' +
  'verify the current position. A Detailed Accident Report forwarded by the police under Section 159 is also treated ' +
  'as a claim. The structured-formula claim under old Section 163A is replaced by Section 164.';

const accidentParticulars = `PARTICULARS OF THE ACCIDENT
(a) Date and time: [DATE, TIME]
(b) Place: [PLACE, ROAD, POLICE STATION LIMITS]
(c) Offending vehicle: Registration No. [__], [TYPE], driven by [DRIVER], owned by [OWNER]
(d) Insurer and policy: [INSURER], Policy No. [__], valid from [DATE] to [DATE]
(e) FIR / police report: Crime No. [__] of [YEAR], [NAME] Police Station, under Sections [__]
(f) Driving licence of the driver: No. [__], valid up to [DATE]

HOW THE ACCIDENT HAPPENED
[NARRATIVE: THE VICTIM WAS [WALKING / RIDING / TRAVELLING] AT [PLACE] WHEN THE OFFENDING VEHICLE, DRIVEN RASHLY AND NEGLIGENTLY AT HIGH SPEED [ON THE WRONG SIDE / WITHOUT SIGNAL], HIT [__]. THE VICTIM WAS NOT AT FAULT.]`;

const respondents = `1. [DRIVER NAME, ADDRESS] — Driver of vehicle No. [__] ... RESPONDENT No. 1
2. [OWNER NAME, ADDRESS] — Owner of vehicle No. [__] ... RESPONDENT No. 2
3. [INSURANCE COMPANY], represented by its [BRANCH / DIVISIONAL MANAGER], [ADDRESS] — Insurer ... RESPONDENT No. 3`;

module.exports = [
  {
    id: 'mact-death',
    title: 'Motor accident claim — death',
    category: 'Motor accident claims',
    forum: 'Motor Accidents Claims Tribunal',
    law: 'Section 166 Motor Vehicles Act, 1988 (as amended in 2019)',
    use: 'Compensation for the legal representatives of a person killed in a road accident.',
    facts: [
      'Claimants: names, ages, relationship to the deceased, addresses',
      'Deceased: name, age, occupation, monthly income, place of residence',
      'Accident: date, time, place, how it happened',
      'Offending vehicle: number, driver, owner, insurer, policy number',
      'FIR / police report details; post-mortem details',
      'Dependants and their ages',
      'Funeral and other expenses',
      'Compensation claimed under each head',
    ],
    annexures: [
      'FIR and charge-sheet / final report',
      'Post-mortem report and death certificate',
      'Proof of age and income of the deceased (salary slips, ITRs)',
      'Proof of relationship of the claimants (legal heir certificate)',
      'Vehicle registration, insurance policy and driving licence copies',
      'Bills for funeral and medical expenses',
    ],
    instructions: MACT_NOTES,
    template: `BEFORE THE MOTOR ACCIDENTS CLAIMS TRIBUNAL AT [PLACE]

M.V.C. No. [____] of [YEAR]

CLAIMANTS:
1. [NAME], [AGE], [RELATIONSHIP — e.g. WIFE OF THE DECEASED], residing at [ADDRESS]
2. [NAME], [AGE], [RELATIONSHIP], residing at [ADDRESS]

VERSUS

RESPONDENTS:
${respondents}

CLAIM PETITION UNDER SECTION 166 OF THE MOTOR VEHICLES ACT, 1988, FOR COMPENSATION OF RS. [AMOUNT] FOR THE DEATH OF [NAME OF DECEASED]

The Claimants most respectfully submit as follows:

1. The Claimants are the legal representatives of [NAME], who died in a road accident on [DATE]. They were dependent on the deceased.

PARTICULARS OF THE DECEASED
(a) Name, age: [NAME], [AGE] years
(b) Occupation and monthly income: [OCCUPATION], Rs. [__] per month
(c) Residence: [ADDRESS]

${accidentParticulars}

2. The deceased suffered fatal injuries and died [ON THE SPOT / AT [HOSPITAL] ON [DATE]]. A post-mortem was conducted at [HOSPITAL] on [DATE].

3. The accident was caused solely by the rash and negligent driving of Respondent No. 1. Respondent No. 2, as owner, and Respondent No. 3, as insurer, are jointly and severally liable to pay compensation.

COMPENSATION CLAIMED
(a) Loss of dependency (income Rs. [__], future prospects [__]%, deduction for personal expenses [__], multiplier [__]): Rs. [__]
(b) Loss of estate: Rs. [__]
(c) Loss of consortium: Rs. [__]
(d) Funeral expenses: Rs. [__]
(e) Medical expenses, if any: Rs. [__]
Total: Rs. [__]

4. This Tribunal has jurisdiction under Section 166(2) as [THE ACCIDENT OCCURRED / THE CLAIMANTS RESIDE] within its limits.

5. [LIMITATION: THE ACCIDENT OCCURRED ON [DATE]; THE CLAIM IS FILED ON [DATE].]

PRAYER
6. The Claimants pray that this Tribunal may be pleased to award compensation of Rs. [__] with interest at [__]% per annum from the date of the petition till realisation, payable jointly and severally by the Respondents, together with costs.

${advocateBlock('CLAIMANTS')}

${verification('CLAIMANTS', 'claim petition')}

${listOfDocuments}`,
  },
  {
    id: 'mact-injury',
    title: 'Motor accident claim — injury',
    category: 'Motor accident claims',
    forum: 'Motor Accidents Claims Tribunal',
    law: 'Section 166 Motor Vehicles Act, 1988 (as amended in 2019)',
    use: 'Compensation for a person injured in a road accident.',
    facts: [
      'Claimant (injured): name, age, occupation, monthly income, address',
      'Accident: date, time, place, how it happened',
      'Offending vehicle: number, driver, owner, insurer, policy number',
      'FIR / police report details',
      'Injuries, treatment, hospital stay, surgeries',
      'Permanent disability (% and certificate) and effect on earning capacity',
      'Medical expenses, loss of earnings during treatment, future treatment',
    ],
    annexures: [
      'FIR and charge-sheet / final report',
      'Wound certificate, discharge summary, medical records',
      'Disability certificate',
      'Medical bills and receipts',
      'Proof of income',
      'Vehicle registration, insurance policy and driving licence copies',
    ],
    instructions: MACT_NOTES,
    template: `BEFORE THE MOTOR ACCIDENTS CLAIMS TRIBUNAL AT [PLACE]

M.V.C. No. [____] of [YEAR]

CLAIMANT:
[NAME], [AGE], [OCCUPATION], residing at [ADDRESS]

VERSUS

RESPONDENTS:
${respondents}

CLAIM PETITION UNDER SECTION 166 OF THE MOTOR VEHICLES ACT, 1988, FOR COMPENSATION OF RS. [AMOUNT] FOR INJURIES

The Claimant most respectfully submits as follows:

1. The Claimant was injured in a road accident on [DATE]. The Claimant is a [OCCUPATION] earning Rs. [__] per month.

${accidentParticulars}

2. The Claimant suffered the following injuries: [INJURIES]. The Claimant was treated as an in-patient at [HOSPITAL] from [DATE] to [DATE] and underwent [SURGERIES / TREATMENT].

3. The Claimant has been assessed with [__]% permanent disability [OF THE [LIMB] / WHOLE BODY], which has reduced the Claimant's earning capacity by [__]%.

4. The accident was caused solely by the rash and negligent driving of Respondent No. 1. Respondents Nos. 1 to 3 are jointly and severally liable.

COMPENSATION CLAIMED
(a) Medical expenses: Rs. [__]
(b) Loss of earnings during treatment: Rs. [__]
(c) Loss of future earnings due to disability: Rs. [__]
(d) Pain and suffering: Rs. [__]
(e) Loss of amenities: Rs. [__]
(f) Attendant, conveyance and nourishment: Rs. [__]
(g) Future medical expenses: Rs. [__]
Total: Rs. [__]

5. This Tribunal has jurisdiction under Section 166(2) as [THE ACCIDENT OCCURRED / THE CLAIMANT RESIDES] within its limits.

PRAYER
6. The Claimant prays that this Tribunal may be pleased to award compensation of Rs. [__] with interest at [__]% per annum from the date of the petition till realisation, payable jointly and severally by the Respondents, together with costs.

${advocateBlock('CLAIMANT')}

${verification('CLAIMANT', 'claim petition')}

${listOfDocuments}`,
  },
];
