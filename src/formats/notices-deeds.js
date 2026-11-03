'use strict';

// Legal notices, affidavits, vakalatnama and common deeds / agreements.

const NOTICE_NOTES =
  "Legal notice conventions: on the advocate's letterhead; mode of dispatch at the top (Registered Post A.D. / Speed Post / " +
  'Courier / Email); date; addressee with full address; "Under instructions from and on behalf of my client …"; ' +
  'numbered paragraphs stating the facts, the legal basis and the demand; a clear time limit; the consequence of ' +
  'non-compliance; notice charges; a copy retained. Firm and factual — no threats beyond lawful proceedings.';

const DEED_NOTES =
  'Deed conventions: title; date and place of execution; parties with full descriptions (who is called "Party of the First ' +
  'Part" etc., "which expression shall include their heirs, legal representatives and assigns"); recitals (WHEREAS …); ' +
  'operative clauses (NOW THIS DEED WITNESSETH …) in numbered clauses; schedule of property; signatures of the parties and two ' +
  'witnesses with addresses. Stamp duty and registration depend on the State and the document — leave them as [TO CONFIRM] ' +
  'unless given. Do not invent property particulars.';

const noticeHead = `[ADVOCATE NAME]
Advocate
[OFFICE ADDRESS, PHONE, EMAIL]

BY [REGISTERED POST A.D. / SPEED POST / COURIER / EMAIL]

Date: [DATE]

To,
[NAME OF ADDRESSEE]
[FULL ADDRESS]`;

const noticeEnd = `Kindly note that a copy of this notice is retained in my office for further action.

Yours faithfully,

[ADVOCATE NAME]
Advocate for [CLIENT NAME]`;

const witnesses = `WITNESSES:
1. Name: [__]
   Address: [__]
   Signature: [__]

2. Name: [__]
   Address: [__]
   Signature: [__]`;

module.exports = [
  {
    id: 'notice-demand',
    title: 'Legal notice (demand)',
    category: 'Notices, deeds & affidavits',
    forum: 'Sent to the opposite party before litigation',
    law: 'General law; state the provisions relevant to the claim',
    use: 'Demanding payment, performance or cessation before filing a case.',
    facts: [
      'Client (name, address) and addressee (name, address)',
      'Relationship / transaction and its dates',
      'The breach or default',
      'Exact demand (amount with interest, act to be done)',
      'Time given to comply',
      'Proceedings to follow if not complied with',
    ],
    annexures: ['Copies of documents referred to (optional)'],
    instructions: NOTICE_NOTES,
    template: `${noticeHead}

Sub: Legal notice for [SUBJECT]

Sir / Madam,

Under instructions from and on behalf of my client, [CLIENT NAME], [DESCRIPTION], residing at [ADDRESS] (hereinafter "my client"), I hereby serve upon you the following legal notice:

1. [FACTS — ONE PER PARAGRAPH, WITH DATES.]

2. [YOUR BREACH / DEFAULT.]

3. Despite repeated requests by my client on [DATES], you have failed to [__].

4. Your acts amount to [BREACH OF CONTRACT / OTHER LEGAL WRONG], making you liable to [__].

5. I therefore call upon you to [PAY Rs. [__] WITH INTEREST AT [RATE]% PER ANNUM FROM [DATE] / DO THE ACT] within [15] days of receipt of this notice, failing which my client shall be constrained to initiate appropriate legal proceedings against you, at your risk as to costs and consequences.

6. You are also liable to pay Rs. [__] towards the cost of this notice.

${noticeEnd}`,
  },
  {
    id: 'notice-cheque-138',
    title: 'Cheque dishonour demand notice (Section 138(b) NI Act)',
    category: 'Notices, deeds & affidavits',
    forum: 'Sent to the drawer of the dishonoured cheque',
    law: 'Section 138(b) & (c) Negotiable Instruments Act, 1881',
    use: 'The mandatory demand notice before a cheque bounce complaint.',
    facts: [
      'Payee (client) and drawer (addressee, and directors if a company)',
      'Debt or liability for which the cheque was issued',
      'Cheque number, date, amount, drawee bank and branch',
      'Date of presentation and payee\'s bank',
      'Date of the bank return memo, reason for dishonour, and date the client received it',
    ],
    annexures: ['Copy of the cheque and the return memo (optional)'],
    instructions:
      `${NOTICE_NOTES} This notice must be sent within 30 days of the payee receiving information of dishonour from the bank, and ` +
      'must demand payment of the cheque amount within 15 days of receipt of the notice. Demand the cheque amount clearly and ' +
      'separately; if any other sums (interest, notice charges) are claimed, state them separately so the cheque amount ' +
      'demand stands on its own. Address it to every person who may be made an accused (the company and its responsible directors).',
    template: `${noticeHead}

Sub: Statutory notice under Section 138(b) of the Negotiable Instruments Act, 1881, regarding dishonour of cheque No. [__] dated [DATE] for Rs. [AMOUNT]

Sir / Madam,

Under instructions from and on behalf of my client, [CLIENT NAME], residing at / having its office at [ADDRESS], I hereby give you notice as follows:

1. You owed my client a legally enforceable debt of Rs. [AMOUNT] towards [NATURE OF THE DEBT].

2. In discharge of that liability you issued cheque No. [__] dated [DATE] for Rs. [AMOUNT], drawn on [BANK, BRANCH], in favour of my client.

3. My client presented the cheque through [BANK, BRANCH] on [DATE]. It was returned unpaid with the endorsement "[REASON]" by return memo dated [DATE], received by my client on [DATE].

4. I therefore call upon you to pay the said cheque amount of Rs. [AMOUNT] (Rupees [AMOUNT IN WORDS] only) to my client within 15 days of receipt of this notice.

5. Please take notice that if you fail to pay the cheque amount within 15 days of receipt of this notice, my client shall initiate criminal proceedings against you under Section 138 of the Negotiable Instruments Act, 1881, and such other proceedings as are available in law, entirely at your risk as to costs and consequences.

6. [SEPARATELY: my client also claims Rs. [__] towards the cost of this notice.]

${noticeEnd}`,
  },
  {
    id: 'notice-reply',
    title: 'Reply to legal notice',
    category: 'Notices, deeds & affidavits',
    forum: 'Sent to the advocate / party who issued the notice',
    law: 'General law',
    use: 'Responding to a legal notice received by your client.',
    facts: [
      'Notice received: sender, advocate, date, reference',
      "Client's version of the facts",
      'Point-by-point admissions and denials',
      'Counter-claims or demands, if any',
    ],
    annexures: ['Copy of the notice received (optional)'],
    instructions: `${NOTICE_NOTES} Deny each allegation specifically and state the client's version; a general denial alone is weak. Keep it measured.`,
    template: `${noticeHead}
(Advocate for [SENDER])

Sub: Reply to your legal notice dated [DATE] issued on behalf of [SENDER]

Sir / Madam,

Under instructions from and on behalf of my client, [CLIENT NAME], I reply to your notice dated [DATE], received by my client on [DATE], as follows:

1. At the outset, all allegations in your notice are denied, except those specifically admitted below.

2. The contents of paragraph [__] of your notice are [ADMITTED / DENIED]. [REPLY.]

[REPLY TO EACH PARAGRAPH.]

3. The true facts are that [CLIENT'S VERSION].

4. [COUNTER-DEMAND, IF ANY.]

5. In view of the above, your client's demand is untenable, and your client is called upon to withdraw the notice. Any proceedings initiated will be defended at your client's risk as to costs.

${noticeEnd}`,
  },
  {
    id: 'notice-section-80',
    title: 'Notice to Government before suit (Section 80 CPC)',
    category: 'Notices, deeds & affidavits',
    forum: 'Sent to the Government / public officer before suing them',
    law: 'Section 80 CPC',
    use: 'Mandatory two months\' notice before a suit against the Government or a public officer for an official act.',
    facts: [
      'Client (name, description, place of residence)',
      'Government / department / public officer to be sued',
      'Cause of action with dates',
      'Relief to be claimed in the suit',
    ],
    annexures: ['Copies of relevant orders / correspondence'],
    instructions:
      `${NOTICE_NOTES} Section 80 requires the notice to state the name, description and place of residence of the person giving it, ` +
      'the cause of action, and the relief claimed. The suit may be filed only after two months from delivery. Address it to the ' +
      'authority named in Section 80(1) — for a State Government, the Secretary to that Government or the Collector of the district; ' +
      'for the Central Government, the Secretary to that Government (the General Manager for a railway). For a public officer, ' +
      'also deliver it to the officer.',
    template: `${noticeHead.replace('[NAME OF ADDRESSEE]', '[THE SECRETARY TO THE GOVERNMENT OF [STATE], [DEPARTMENT] / THE COLLECTOR, [DISTRICT]]')}

Sub: Notice under Section 80 of the Code of Civil Procedure, 1908

Sir,

Under instructions from and on behalf of my client, [CLIENT NAME], [DESCRIPTION], residing at [PLACE OF RESIDENCE], I give you notice under Section 80 of the Code of Civil Procedure, 1908, as follows:

1. [FACTS GIVING RISE TO THE CLAIM, WITH DATES.]

2. CAUSE OF ACTION: [WHEN AND HOW IT AROSE].

3. RELIEF CLAIMED: [RELIEF], amounting to Rs. [__] / [OTHER RELIEF].

4. My client calls upon you to [GRANT THE RELIEF] within two months of delivery of this notice, failing which my client will institute a suit against the [GOVERNMENT / OFFICER] for the above relief, with costs, without further notice.

${noticeEnd}`,
  },
  {
    id: 'notice-tenancy-termination',
    title: 'Notice terminating tenancy',
    category: 'Notices, deeds & affidavits',
    forum: 'Sent by the landlord to the tenant',
    law: 'Section 106 Transfer of Property Act, 1882 (subject to the State rent control law)',
    use: 'Ending a monthly or yearly tenancy before seeking eviction.',
    facts: [
      'Landlord (client) and tenant',
      'Premises: full address and description',
      'Tenancy: start date, rent, whether monthly or yearly, written agreement if any',
      'Reason for termination, if relevant under the State rent law',
      'Date by which possession must be handed over',
    ],
    annexures: [],
    instructions:
      `${NOTICE_NOTES} Under Section 106 TPA (unless a contract or local law provides otherwise), a month-to-month tenancy may be ` +
      'ended by 15 days\' notice, and a year-to-year agricultural or manufacturing lease by six months\' notice, in writing, signed ' +
      'and sent by post or delivered. State rent control laws may require specific grounds or procedures — note any that apply.',
    template: `${noticeHead}

Sub: Notice terminating your tenancy of [PREMISES ADDRESS]

Sir / Madam,

Under instructions from and on behalf of my client, [LANDLORD NAME], the owner and landlord of the premises at [ADDRESS] ("the premises"), I hereby give you notice as follows:

1. You are a tenant of the premises under my client on a monthly rent of Rs. [__], under [AGREEMENT DATED [DATE] / ORAL TENANCY] from [DATE].

2. [REASONS, IF ANY.]

3. My client hereby terminates your tenancy with effect from the expiry of [DATE / THE MONTH OF TENANCY ENDING ON [DATE]].

4. You are called upon to quit and deliver vacant and peaceful possession of the premises to my client on or before [DATE], and to pay all arrears of rent and charges up to that date.

5. If you fail to do so, my client will initiate eviction proceedings and claim damages for use and occupation from the date of termination, at your risk as to costs.

${noticeEnd}`,
  },
  {
    id: 'affidavit-general',
    title: 'General affidavit',
    category: 'Notices, deeds & affidavits',
    forum: 'Sworn before a Notary / Oath Commissioner / court officer',
    law: 'General; Order XIX CPC for affidavits in court proceedings',
    use: 'Sworn statement of facts — name change, address, income, loss of documents, declarations.',
    facts: [
      'Deponent (name, parentage, age, occupation, address)',
      'Purpose of the affidavit',
      'Facts to be stated, one by one',
    ],
    annexures: ['Identity proof of the deponent'],
    instructions:
      'Confine the affidavit to facts within the deponent\'s knowledge (Order XIX Rule 3 CPC). Number each statement. Distinguish ' +
      'statements from personal knowledge from those on information and belief, and state the source of any information.',
    template: `AFFIDAVIT

I, [NAME], [SON / DAUGHTER / WIFE] of [FATHER'S / HUSBAND'S NAME], aged about [AGE] years, [OCCUPATION], residing at [ADDRESS], do hereby solemnly affirm and state on oath as follows:

1. I am [DESCRIPTION OF THE DEPONENT AND THE PURPOSE].

2. [FACT.]

3. [FACT.]

4. This affidavit is made for the purpose of [PURPOSE] and for no other purpose.

DEPONENT

VERIFICATION

I, the deponent above named, verify that the contents of paragraphs 1 to [__] above are true and correct to my knowledge and belief, no part of it is false, and nothing material has been concealed.

Verified at [PLACE] on this [DAY] day of [MONTH, YEAR].

DEPONENT

[Identified by me: ADVOCATE]
[Sworn before me: NOTARY / OATH COMMISSIONER]`,
  },
  {
    id: 'affidavit-evidence',
    title: 'Affidavit of evidence (examination-in-chief)',
    category: 'Notices, deeds & affidavits',
    forum: 'The trial court',
    law: 'Order XVIII Rule 4 CPC',
    use: "A witness's chief examination in a civil suit, filed as an affidavit.",
    facts: [
      'Suit number, court, parties',
      'Witness (name, age, address, relation to the case, e.g. PW-1)',
      'Facts the witness will prove, in order',
      'Documents the witness will produce and their exhibit marks',
    ],
    annexures: ['The documents to be marked as exhibits'],
    instructions:
      'Write in the first person, in the witness\'s own account, limited to facts the witness can prove. Refer to each document ' +
      'with its proposed exhibit mark (Ex. P-1, P-2 …). Do not include legal argument.',
    template: `IN THE COURT OF THE [COURT] AT [PLACE]

ORIGINAL SUIT No. [____] of [YEAR]

[PLAINTIFF] ... PLAINTIFF
VERSUS
[DEFENDANT] ... DEFENDANT

AFFIDAVIT OF EVIDENCE OF [WITNESS NAME] (PW-[__] / DW-[__]) UNDER ORDER XVIII RULE 4 OF THE CODE OF CIVIL PROCEDURE, 1908

I, [NAME], [SON / DAUGHTER / WIFE] of [__], aged about [AGE] years, [OCCUPATION], residing at [ADDRESS], do hereby solemnly affirm and state as follows:

1. I am the [PLAINTIFF / DEFENDANT / WITNESS] in the above suit and am acquainted with the facts. I am competent to depose to them.

2. [FACT, IN THE WITNESS'S OWN WORDS.]

3. [FACT.] The [DOCUMENT] dated [DATE] is produced and may be marked as Ex. P-[__].

[CONTINUE.]

DEPONENT

VERIFICATION

Verified at [PLACE] on this [DAY] day of [MONTH, YEAR] that the contents of the above affidavit are true and correct to my knowledge and belief.

DEPONENT`,
  },
  {
    id: 'vakalatnama',
    title: 'Vakalatnama',
    category: 'Notices, deeds & affidavits',
    forum: 'Filed in the court where the advocate appears',
    law: 'Order III Rule 4 CPC; the rules of the court concerned',
    use: 'Authorising an advocate to appear and act for a party.',
    facts: [
      'Court and case number',
      'Client(s) and their position in the case',
      'Advocate(s): names, enrolment numbers, address',
    ],
    annexures: ['Advocate welfare stamp / court fee as required by the court'],
    instructions:
      'Vakalatnama formats and stamp requirements differ between courts and States; follow the court\'s prescribed form if one is ' +
      'available and leave stamp details as [TO CONFIRM].',
    template: `IN THE [COURT] AT [PLACE]

[CASE TYPE] No. [____] of [YEAR]

[PARTY NAME] ... [PETITIONER / PLAINTIFF / APPELLANT]
VERSUS
[PARTY NAME] ... [RESPONDENT / DEFENDANT]

VAKALATNAMA

I / We, [CLIENT NAME(S)], the [POSITION] above named, do hereby appoint and retain:

[ADVOCATE NAME], Advocate, Enrolment No. [__]
[OFFICE ADDRESS, PHONE, EMAIL]

to appear, plead and act for me / us in the above case, and in all proceedings connected with it, including applications, execution, appeals and revisions arising from it, and for that purpose to sign and file pleadings, applications, affidavits and documents, receive money and documents, compromise or withdraw the case [ONLY WITH MY / OUR WRITTEN CONSENT], and do all acts necessary for the conduct of the case.

I / We agree to ratify all acts done by the said Advocate in pursuance of this authority.

Signed at [PLACE] on this [DAY] day of [MONTH, YEAR].

[CLIENT SIGNATURE(S)]

Accepted:
[ADVOCATE SIGNATURE]
[ADVOCATE NAME], Advocate`,
  },
  {
    id: 'deed-rental-agreement',
    title: 'Rental / leave and licence agreement',
    category: 'Notices, deeds & affidavits',
    forum: 'Executed between owner and occupant',
    law: 'Transfer of Property Act, 1882; Indian Easements Act, 1882 (licence); Registration Act, 1908; State stamp and rent laws',
    use: 'Residential or commercial letting, typically for 11 months.',
    facts: [
      'Owner / landlord and tenant / licensee (names, ages, addresses)',
      'Premises: full address, area, fixtures and fittings',
      'Period (start and end dates)',
      'Monthly rent / licence fee, due date, mode of payment, escalation',
      'Security deposit and refund terms',
      'Maintenance, electricity, water and other charges — who pays',
      'Lock-in period, notice period, permitted use',
    ],
    annexures: ['Inventory of fixtures and fittings', 'Identity proofs of both parties'],
    instructions:
      `${DEED_NOTES} A lease from year to year or for more than one year must be registered (Section 17, Registration Act). Some ` +
      'States require leave and licence agreements to be registered regardless of term (e.g. Maharashtra). Choose "lease" or ' +
      '"leave and licence" language consistently, as instructed.',
    template: `[RENTAL AGREEMENT / LEAVE AND LICENCE AGREEMENT]

This Agreement is made and executed at [PLACE] on this [DAY] day of [MONTH, YEAR],

BETWEEN

[OWNER NAME], [SON / DAUGHTER / WIFE] of [__], aged about [__] years, residing at [ADDRESS] (hereinafter called the "[OWNER / LICENSOR]", which expression shall, unless repugnant to the context, include their heirs, legal representatives and assigns) of the ONE PART;

AND

[TENANT NAME], [SON / DAUGHTER / WIFE] of [__], aged about [__] years, [OCCUPATION], permanent address [ADDRESS] (hereinafter called the "[TENANT / LICENSEE]", which expression shall include their heirs, legal representatives and permitted assigns) of the OTHER PART.

WHEREAS the [OWNER] is the absolute owner of the premises described in the Schedule below ("the Premises"), and the [TENANT] has requested the [OWNER] to let the Premises for [RESIDENTIAL / COMMERCIAL] use, which the [OWNER] has agreed to on the following terms:

NOW THIS AGREEMENT WITNESSETH AS FOLLOWS:

1. PERIOD: The Premises are let for a period of [11] months commencing from [DATE] and ending on [DATE], renewable by mutual written consent.

2. RENT: The [TENANT] shall pay a monthly [RENT / LICENCE FEE] of Rs. [__] on or before the [__] day of each month by [MODE]. [ESCALATION OF [__]% ON RENEWAL.]

3. SECURITY DEPOSIT: The [TENANT] has paid an interest-free security deposit of Rs. [__], refundable on handing over vacant possession, after deducting any arrears or damage beyond normal wear and tear.

4. CHARGES: Electricity, water and [OTHER] charges shall be paid by the [TENANT / OWNER]. Property tax shall be paid by the [OWNER].

5. USE: The Premises shall be used only for [PURPOSE]. The [TENANT] shall not sub-let, assign or part with possession.

6. MAINTENANCE: The [TENANT] shall keep the Premises in good condition. Major structural repairs shall be the [OWNER]'s responsibility.

7. TERMINATION: Either party may terminate this Agreement by giving [ONE] month's written notice. [LOCK-IN PERIOD OF [__] MONTHS.]

8. HANDOVER: On expiry or termination, the [TENANT] shall hand over vacant and peaceful possession of the Premises with the fixtures listed in the Annexure.

9. The [OWNER] or their agent may inspect the Premises at reasonable times with prior notice.

10. Stamp duty of Rs. [__] [AND REGISTRATION CHARGES] shall be borne by [__].

SCHEDULE OF THE PREMISES
[FULL ADDRESS, FLOOR, AREA, PARKING, FIXTURES]

IN WITNESS WHEREOF the parties have signed this Agreement on the day, month and year first above written.

[OWNER]                                  [TENANT]

${witnesses}`,
  },
  {
    id: 'deed-agreement-to-sell',
    title: 'Agreement to sell (immovable property)',
    category: 'Notices, deeds & affidavits',
    forum: 'Executed between seller and buyer',
    law: 'Section 54 Transfer of Property Act, 1882; Indian Contract Act, 1872; State stamp and registration law',
    use: 'Recording the terms of a proposed sale before the sale deed.',
    facts: [
      'Seller(s) and buyer(s)',
      "Property: survey / khata / door no., extent, boundaries, seller's title (deed details)",
      'Total consideration, advance paid (date, mode), balance and when payable',
      'Time for completing the sale',
      "Seller's obligations: clear title, encumbrance certificate, approvals, vacant possession",
      'Consequences of default by either party',
    ],
    annexures: ['Copy of the seller\'s title deed', 'Encumbrance certificate', 'Property tax receipts'],
    instructions:
      `${DEED_NOTES} An agreement to sell does not by itself create any interest in the property (Section 54 TPA). If possession is ` +
      'handed over in part performance, registration is needed for the buyer to rely on Section 53A TPA. Provide for default ' +
      'by either side (refund / forfeiture / specific performance).',
    template: `AGREEMENT TO SELL

This Agreement to Sell is made and executed at [PLACE] on this [DAY] day of [MONTH, YEAR],

BETWEEN

[SELLER NAME], [SON / DAUGHTER / WIFE] of [__], aged about [__] years, residing at [ADDRESS] (hereinafter called the "SELLER", which expression shall include their heirs, legal representatives, executors and assigns) of the FIRST PART;

AND

[BUYER NAME], [SON / DAUGHTER / WIFE] of [__], aged about [__] years, residing at [ADDRESS] (hereinafter called the "BUYER", which expression shall include their heirs, legal representatives, executors and assigns) of the SECOND PART.

WHEREAS:
A. The SELLER is the absolute owner in possession of the property described in the Schedule below ("the Schedule Property"), having acquired it under [DEED] dated [DATE], registered as Document No. [__] in the office of the Sub-Registrar, [PLACE].
B. The SELLER has agreed to sell, and the BUYER has agreed to purchase, the Schedule Property on the terms below.

NOW THIS AGREEMENT WITNESSETH AS FOLLOWS:

1. CONSIDERATION: The total sale consideration is Rs. [__] (Rupees [IN WORDS] only).

2. ADVANCE: The BUYER has paid Rs. [__] as advance on [DATE] by [MODE / CHEQUE / TRANSFER DETAILS], the receipt of which the SELLER acknowledges.

3. BALANCE: The balance of Rs. [__] shall be paid at the time of registration of the sale deed, on or before [DATE].

4. TITLE: The SELLER assures that the Schedule Property is free from all encumbrances, charges, litigation and claims, and shall furnish all original title documents, an encumbrance certificate for [__] years and tax-paid receipts.

5. SALE DEED: The SELLER shall execute and register the sale deed in favour of the BUYER or their nominee on receipt of the balance consideration, and deliver vacant possession on that date.

6. EXPENSES: Stamp duty, registration fees and incidental expenses of the sale deed shall be borne by the [BUYER].

7. DEFAULT BY THE SELLER: If the SELLER fails to complete the sale, the BUYER shall be entitled to seek specific performance of this Agreement and / or refund of the advance with [__] and damages.

8. DEFAULT BY THE BUYER: If the BUYER fails to pay the balance within the agreed time, the SELLER may [FORFEIT Rs. [__] OUT OF THE ADVANCE / TERMINATE THIS AGREEMENT ON NOTICE].

9. Time is of the essence of this Agreement.

SCHEDULE PROPERTY
[DESCRIPTION, SURVEY / KHATA / DOOR NO., EXTENT, VILLAGE / WARD, TALUK, DISTRICT]
Bounded on the: North by [__]; South by [__]; East by [__]; West by [__].

IN WITNESS WHEREOF the parties have signed this Agreement on the day, month and year first above written.

SELLER                                   BUYER

${witnesses}`,
  },
  {
    id: 'deed-gpa',
    title: 'General power of attorney',
    category: 'Notices, deeds & affidavits',
    forum: 'Executed before a Notary / Sub-Registrar',
    law: 'Powers of Attorney Act, 1882; Registration Act, 1908; State stamp law',
    use: 'Authorising an agent to manage property and affairs generally.',
    facts: [
      'Principal (name, address) and attorney (name, address, relationship)',
      'Property or affairs covered',
      'Powers granted (manage, lease, collect rent, represent before authorities, litigation, sell)',
      'Whether the power may be delegated, and its duration',
    ],
    annexures: ['Identity proofs and photographs of both parties'],
    instructions:
      `${DEED_NOTES} List each power in a separate numbered clause. A transfer of title cannot be effected by a GPA alone — a sale ` +
      'needs a registered sale deed. A power of attorney authorising sale of immovable property may need registration under ' +
      'State law. Include a ratification clause.',
    template: `GENERAL POWER OF ATTORNEY

KNOW ALL MEN BY THESE PRESENTS that I, [PRINCIPAL NAME], [SON / DAUGHTER / WIFE] of [__], aged about [__] years, residing at [ADDRESS] (hereinafter called the "PRINCIPAL"), do hereby nominate, constitute and appoint [ATTORNEY NAME], [SON / DAUGHTER / WIFE] of [__], aged about [__] years, residing at [ADDRESS] (hereinafter called the "ATTORNEY"), as my true and lawful attorney, to do the following acts, deeds and things in my name and on my behalf:

1. To manage, look after and maintain my property described in the Schedule below.

2. To let out the property, execute lease / rental agreements, collect rents and give valid receipts.

3. To pay taxes, charges and dues, and to represent me before all Government, municipal, revenue and other authorities.

4. To appear before any court, tribunal or authority; to sign, verify and file plaints, petitions, affidavits and applications; and to engage advocates.

5. [OTHER SPECIFIC POWERS.]

6. Generally, to do all lawful acts necessary for the above purposes.

AND I hereby agree to ratify and confirm all acts lawfully done by my Attorney under this power.

SCHEDULE
[PROPERTY DESCRIPTION]

IN WITNESS WHEREOF I have signed this deed at [PLACE] on this [DAY] day of [MONTH, YEAR].

PRINCIPAL

I accept the above appointment.
ATTORNEY

${witnesses}`,
  },
  {
    id: 'deed-spa',
    title: 'Special power of attorney',
    category: 'Notices, deeds & affidavits',
    forum: 'Executed before a Notary / Sub-Registrar',
    law: 'Powers of Attorney Act, 1882; Registration Act, 1908; State stamp law',
    use: 'Authorising an agent for one specific act or transaction.',
    facts: [
      'Principal and attorney',
      'The specific act authorised (e.g. register a sale deed, appear in a particular case)',
      'Property / case concerned',
      'Duration or event on which it ends',
    ],
    annexures: ['Identity proofs and photographs'],
    instructions: `${DEED_NOTES} Confine the power strictly to the specific act; state when it comes to an end.`,
    template: `SPECIAL POWER OF ATTORNEY

KNOW ALL MEN BY THESE PRESENTS that I, [PRINCIPAL NAME], [SON / DAUGHTER / WIFE] of [__], aged about [__] years, residing at [ADDRESS], do hereby appoint [ATTORNEY NAME], [SON / DAUGHTER / WIFE] of [__], aged about [__] years, residing at [ADDRESS], as my attorney for the limited and specific purpose of [SPECIFIC ACT], and for that purpose to:

1. [SPECIFIC POWER.]

2. [SPECIFIC POWER.]

This power is limited to the above purpose and shall stand revoked on [COMPLETION OF THE ACT / DATE], whichever is earlier.

I agree to ratify all acts lawfully done by my Attorney within the scope of this power.

Signed at [PLACE] on this [DAY] day of [MONTH, YEAR].

PRINCIPAL

ATTORNEY (accepting)

${witnesses}`,
  },
];
