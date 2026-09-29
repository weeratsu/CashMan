// help-data.js — Help page translations & rendering (v2.0 — categorized index)
// Comprehensive reference: Thai Labour Law, Tax, SSO, Provident Fund, Company Benefits
// ~25 sections × 3 languages (EN/TH/JA) with search, TOC, badges
var HELP_LANG='en';

/* ── Category definitions ── */
var HELP_CATEGORIES={
'getting-started':{icon:'\ud83d\udccb',en:'Getting Started',th:'\u0e40\u0e23\u0e34\u0e48\u0e21\u0e15\u0e49\u0e19\u0e43\u0e0a\u0e49\u0e07\u0e32\u0e19',ja:'\u306f\u3058\u3081\u306b'},
'labour-law':{icon:'\ud83c\udfdb\ufe0f',en:'Thai Labour Law',th:'\u0e01\u0e0e\u0e2b\u0e21\u0e32\u0e22\u0e41\u0e23\u0e07\u0e07\u0e32\u0e19\u0e44\u0e17\u0e22',ja:'\u30bf\u30a4\u52b4\u50cd\u6cd5'},
'tax':{icon:'\ud83d\udcb0',en:'Tax & Withholding',th:'\u0e20\u0e32\u0e29\u0e35\u0e41\u0e25\u0e30\u0e01\u0e32\u0e23\u0e2b\u0e31\u0e01\u0e20\u0e32\u0e29\u0e35',ja:'\u7a0e\u91d1\u30fb\u6e90\u6cc9\u5f81\u53ce'},
'social-security':{icon:'\ud83d\udee1\ufe0f',en:'Social Security',th:'\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21',ja:'\u793e\u4f1a\u4fdd\u969c'},
'provident-fund':{icon:'\ud83c\udfe6',en:'Provident Fund / EPF',th:'\u0e01\u0e2d\u0e07\u0e17\u0e38\u0e19\u0e2a\u0e33\u0e23\u0e2d\u0e07\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07\u0e0a\u0e35\u0e1e',ja:'\u9000\u8077\u7a4d\u7acb\u57fa\u91d1'},
'company-benefits':{icon:'\ud83c\udfe2',en:'Company Benefits (DXC)',th:'\u0e2a\u0e27\u0e31\u0e2a\u0e14\u0e34\u0e01\u0e32\u0e23\u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17 (DXC)',ja:'\u4f1a\u793e\u798f\u5229 (DXC)'},
'app-features':{icon:'\ud83d\udcca',en:'App Features',th:'\u0e1f\u0e35\u0e40\u0e08\u0e2d\u0e23\u0e4c\u0e41\u0e2d\u0e1b',ja:'\u30a2\u30d7\u30ea\u6a5f\u80fd'}
};

/* ── Section data per language ── */
var HELP_DATA={
en:{
title:'Help & Reference',
searchPlaceholder:'Search help topics...',
tocTitle:'Table of Contents',
noResults:'No matching topics found.',
sections:[
// ═══════════════════════════════════════════════
// 📋 GETTING STARTED
// ═══════════════════════════════════════════════
{id:'help-overview',category:'getting-started',badge:'info',
title:'App Overview',
content:'<p>The <strong>Cash Flow Planner</strong> is a personal finance simulation tool designed for employees in Thailand. It models your monthly payroll, statutory deductions (SSO, tax, provident fund), and company benefits to project your cash flow from now until retirement or a specific end date.</p>'+
'<p style="margin-top:8px"><strong>Key capabilities:</strong></p>'+
'<ul style="padding-left:18px;margin:6px 0"><li>Accurate Thai payroll modelling with SSO ceiling reform &amp; progressive tax</li><li>Separation scenario planning (severance, leave cash-out, notice pay)</li><li>Provident fund vesting &amp; withdrawal option comparison</li><li>Timeline visualisation of income, deductions &amp; net cash flow</li><li>Retirement module with pension &amp; savings projection</li><li>Export/import profiles as JSON for backup or sharing</li></ul>'+
'<p style="margin-top:8px;font-size:10px;color:var(--text3)">This app runs entirely in your browser. No data is sent to any server.</p>'
},
{id:'help-payroll-tab',category:'getting-started',badge:'info',
title:'How to Use: Payroll Tab',
content:'<p>The <strong>Payroll</strong> tab is where you define your monthly income and deduction structure.</p>'+
'<ol style="padding-left:18px;margin:8px 0">'+
'<li><strong>Income items</strong> — Add base salary, allowances, OT, bonus. For each item, toggle checkboxes for <em>SSO</em> (included in SSO wage base) and <em>Tax</em> (included in assessable income).</li>'+
'<li><strong>Deduction items</strong> — Add SSO, provident fund, tax. Each has a <em>Calc Mode</em>: Fixed amount, % of base, % of SSO base, or progressive tax formula.</li>'+
'<li><strong>One-time items</strong> — Model bonuses, 13th month, AIP payouts. Set the month they occur.</li>'+
'<li><strong>Profile</strong> — Set start date, salary, employer name, hire date, birth date for accurate tenure/age calculations.</li>'+
'</ol>'+
'<p style="font-size:10px;color:var(--text3)">Tip: Use the "Recalculate" button after any change to see updated projections.</p>'
},
{id:'help-timeline-tab',category:'getting-started',badge:'info',
title:'How to Use: Timeline Tab',
content:'<p>The <strong>Timeline</strong> tab shows a month-by-month projection of your finances as a stacked area chart.</p>'+
'<ul style="padding-left:18px;margin:8px 0">'+
'<li><strong>Green area</strong> = Net take-home pay</li>'+
'<li><strong>Orange area</strong> = Tax deductions</li>'+
'<li><strong>Blue area</strong> = SSO contributions</li>'+
'<li><strong>Purple area</strong> = Provident fund</li>'+
'</ul>'+
'<p>Hover over any month to see the detailed breakdown. Click to expand the month\'s full payslip.</p>'+
'<p style="margin-top:8px">The <strong>simulation period</strong> slider lets you project 1–60 months into the future. Longer periods help with retirement planning.</p>'
},
{id:'help-retirement-tab',category:'getting-started',badge:'info',
title:'How to Use: Retirement Module',
content:'<p>The <strong>Retirement</strong> module projects your financial position at retirement age.</p>'+
'<ul style="padding-left:18px;margin:8px 0">'+
'<li>Set your target retirement age (default: 55 for SSO pension eligibility)</li>'+
'<li>View projected SSO pension (monthly), provident fund lump sum, and accumulated savings</li>'+
'<li>Compare scenarios: early retirement vs. working longer</li>'+
'<li>Factor in inflation rate (adjustable) for real-value projections</li>'+
'</ul>'
},
// ═══════════════════════════════════════════════
// 🏛️ THAI LABOUR LAW
// ═══════════════════════════════════════════════
{id:'help-sev118',category:'labour-law',badge:'law',
title:'Severance Pay — §118 Labour Protection Act',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f LAW \u2014 Thai Labour Protection Act B.E. 2541, Section 118</div>'+
'<p>When an employer terminates an employee <strong>without cause</strong> (i.e., not under §119 gross misconduct), the employee is entitled to severance pay based on length of continuous service:</p>'+
'<table class="tbl" style="margin:10px 0"><thead><tr><th>Length of Service</th><th class="r">Severance (days of wages)</th></tr></thead><tbody>'+
'<tr><td>Less than 120 days</td><td class="r" style="font-family:var(--mono)">0 days</td></tr>'+
'<tr><td>120 days \u2013 &lt; 1 year</td><td class="r" style="font-family:var(--mono)">30 days</td></tr>'+
'<tr><td>1 year \u2013 &lt; 3 years</td><td class="r" style="font-family:var(--mono)">90 days</td></tr>'+
'<tr><td>3 years \u2013 &lt; 6 years</td><td class="r" style="font-family:var(--mono)">180 days</td></tr>'+
'<tr><td>6 years \u2013 &lt; 10 years</td><td class="r" style="font-family:var(--mono)">240 days</td></tr>'+
'<tr><td>10 years \u2013 &lt; 20 years</td><td class="r" style="font-family:var(--mono)">300 days</td></tr>'+
'<tr style="background:var(--success-bg)"><td><strong>20 years or more</strong></td><td class="r" style="font-family:var(--mono)"><strong>400 days</strong></td></tr>'+
'</tbody></table>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:10px 0">'+
'<strong>Formula:</strong><br>'+
'Daily Wage = Monthly Salary \u00f7 30<br>'+
'Severance Pay = Severance Days \u00d7 Daily Wage<br><br>'+
'<strong>Example:</strong> Salary \u0e3f62,566/mo, 12 years service<br>'+
'Daily wage = 62,566 \u00f7 30 = \u0e3f2,085.53<br>'+
'Severance = 300 \u00d7 2,085.53 = <strong>\u0e3f625,560</strong></div>'+
'<p style="font-size:10px;color:var(--text3)">Note: "Wages" includes base salary and regular fixed allowances. Irregular bonuses/OT are typically excluded. Consult your employment contract.</p>'
},
{id:'help-sev122',category:'labour-law',badge:'law',
title:'Special Severance for Relocation/Technology — §122',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f LAW \u2014 Thai Labour Protection Act B.E. 2541, Section 122</div>'+
'<p>Special severance applies <strong>only</strong> when termination is due to:</p>'+
'<ul style="padding-left:18px;margin:6px 0"><li>Business restructuring or relocation that significantly affects the employee\'s normal life</li><li>Adoption of machinery or technology that reduces the workforce</li></ul>'+
'<p style="margin-top:8px"><strong>Eligibility:</strong> Employee must have worked continuously for <strong>6 years or more</strong>.</p>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:10px 0">'+
'<strong>Formula:</strong><br>'+
'Special Severance = 15 days \u00d7 Daily Wage \u00d7 Full Years of Service<br>'+
'<strong>Maximum:</strong> 360 days\u2019 wages<br><br>'+
'<strong>Example:</strong> Salary \u0e3f60,000/mo, 15 years service<br>'+
'Daily wage = 60,000 \u00f7 30 = \u0e3f2,000<br>'+
'Special sev = 15 \u00d7 2,000 \u00d7 15 = \u0e3f450,000<br>'+
'Capped at 360 \u00d7 2,000 = <strong>\u0e3f720,000</strong> \u2192 pays \u0e3f450,000 (under cap)</div>'+
'<p style="margin-top:8px"><strong>Employer notice requirement:</strong></p>'+
'<ul style="padding-left:18px;margin:6px 0">'+
'<li>Must notify the <strong>Labour Inspector</strong> at least <strong>60 days in advance</strong> of the restructuring</li>'+
'<li>Must simultaneously notify affected employees at least <strong>60 days</strong> before termination</li>'+
'<li><strong>If not notified:</strong> Employer must pay <strong>special severance in lieu of notice</strong> \u2014 equivalent to 60 days\u2019 wages, in addition to the special severance above</li>'+
'</ul>'+
'<p style="font-size:10px;color:var(--text3)">This is <em>in addition to</em> the standard severance under \u00a7118. Both are payable.</p>'
},
{id:'help-notice17',category:'labour-law',badge:'law',
title:'Notice Pay — §17 Labour Protection Act',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f LAW \u2014 Thai Labour Protection Act B.E. 2541, Section 17</div>'+
'<p>Under Thai law, termination of employment with an indefinite-term contract requires <strong>advance written notice</strong>.</p>'+
'<ul style="padding-left:18px;margin:8px 0">'+
'<li>Employer must give written notice <strong>at least one full pay cycle</strong> before the effective date of termination</li>'+
'<li>The notice takes effect on the <strong>next pay date</strong> following receipt</li>'+
'<li>If employer does not give advance notice: must pay <strong>wages in lieu of notice</strong> equal to the wages the employee would have earned during the notice period</li>'+
'</ul>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:10px 0">'+
'<strong>In practice (monthly salary):</strong><br>'+
'Notice period = 1 pay cycle (typically 1 month)<br>'+
'Pay in lieu = 1 month\'s salary<br><br>'+
'<strong>Example:</strong> Salary \u0e3f62,566/mo<br>'+
'Pay in lieu of notice = <strong>\u0e3f62,566</strong></div>'+
'<p style="font-size:10px;color:var(--text3)">Note: The employee may also resign with notice. Notice pay only applies when the employer terminates. This is separate from and in addition to severance pay.</p>'
},
{id:'help-leave-cashout',category:'labour-law',badge:'law',
title:'Annual Leave Cash-Out on Termination',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f LAW \u2014 Thai Labour Protection Act, Section 67</div>'+
'<div class="help-badge help-badge-company" style="margin-top:4px">\ud83c\udfe2 COMPANY \u2014 DXC Technology leave policy</div>'+
'<p style="margin-top:8px">Under Thai law, when employment is terminated, any <strong>unused annual leave</strong> that the employee is entitled to must be paid out as cash.</p>'+
'<h4 style="font-size:11px;font-weight:600;margin:10px 0 4px">DXC Leave Entitlement</h4>'+
'<table class="tbl" style="margin:6px 0"><thead><tr><th>Years of Service</th><th class="r">Annual Leave (days/year)</th></tr></thead><tbody>'+
'<tr><td>Less than 5 years</td><td class="r" style="font-family:var(--mono)">15 days</td></tr>'+
'<tr><td>5 \u2013 &lt; 10 years</td><td class="r" style="font-family:var(--mono)">17 days</td></tr>'+
'<tr><td>10 years or more</td><td class="r" style="font-family:var(--mono)">20 days</td></tr>'+
'</tbody></table>'+
'<h4 style="font-size:11px;font-weight:600;margin:10px 0 4px">Cash-Out Formula</h4>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:6px 0">'+
'Leave Cash-Out = Leave Days \u00d7 (Monthly Salary \u00f7 30)<br><br>'+
'<strong>DXC calculation:</strong><br>'+
'Payout = CY entitlement (pro-rated to term date)<br>'+
'\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0+ LY carry-over balance<br>'+
'\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u2212 Leave Days already taken<br><br>'+
'<strong>Example:</strong> Salary \u0e3f62,566, 8 yrs service, term June 30<br>'+
'CY pro-rated = 17 \u00d7 (6/12) = 8.5 days<br>'+
'LY carry-over = 5 days, taken = 3 days<br>'+
'Net leave = 8.5 + 5 \u2212 3 = 10.5 days<br>'+
'Cash-out = 10.5 \u00d7 (62,566 \u00f7 30) = <strong>\u0e3f21,893</strong></div>'+
'<p style="font-size:10px;color:var(--text3)">Sick leave, personal leave, and other non-annual leave types are not cashed out under Thai law.</p>'
},
// ═══════════════════════════════════════════════
// 💰 TAX & WITHHOLDING
// ═══════════════════════════════════════════════
{id:'help-tax-rates',category:'tax',badge:'law',
title:'Progressive Income Tax Rates',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f LAW \u2014 Revenue Code, Section 48 & 50</div>'+
'<p>Thai personal income tax uses <strong>progressive rates</strong> applied to net taxable income:</p>'+
'<table class="tbl" style="margin:10px 0"><thead><tr><th>Net Taxable Income (THB)</th><th class="r">Rate</th><th class="r">Max Tax in Bracket</th><th class="r">Cumulative Max</th></tr></thead><tbody>'+
'<tr><td>0 \u2013 150,000</td><td class="r">Exempt</td><td class="r" style="font-family:var(--mono)">0</td><td class="r" style="font-family:var(--mono)">0</td></tr>'+
'<tr><td>150,001 \u2013 300,000</td><td class="r">5%</td><td class="r" style="font-family:var(--mono)">7,500</td><td class="r" style="font-family:var(--mono)">7,500</td></tr>'+
'<tr><td>300,001 \u2013 500,000</td><td class="r">10%</td><td class="r" style="font-family:var(--mono)">20,000</td><td class="r" style="font-family:var(--mono)">27,500</td></tr>'+
'<tr><td>500,001 \u2013 750,000</td><td class="r">15%</td><td class="r" style="font-family:var(--mono)">37,500</td><td class="r" style="font-family:var(--mono)">65,000</td></tr>'+
'<tr><td>750,001 \u2013 1,000,000</td><td class="r">20%</td><td class="r" style="font-family:var(--mono)">50,000</td><td class="r" style="font-family:var(--mono)">115,000</td></tr>'+
'<tr><td>1,000,001 \u2013 2,000,000</td><td class="r">25%</td><td class="r" style="font-family:var(--mono)">250,000</td><td class="r" style="font-family:var(--mono)">365,000</td></tr>'+
'<tr><td>2,000,001 \u2013 5,000,000</td><td class="r">30%</td><td class="r" style="font-family:var(--mono)">900,000</td><td class="r" style="font-family:var(--mono)">1,265,000</td></tr>'+
'<tr><td>5,000,001+</td><td class="r">35%</td><td class="r" style="font-family:var(--mono)">\u2014</td><td class="r" style="font-family:var(--mono)">\u2014</td></tr>'+
'</tbody></table>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:10px 0">'+
'<strong>Annual Tax Calculation:</strong><br>'+
'Assessable Income = All employment income for the year<br>'+
'\u2212 Expense Deduction = 50% of employment income, max \u0e3f100,000<br>'+
'\u2212 Personal Allowance = \u0e3f60,000<br>'+
'\u2212 Other Exemptions (SSO, PVD, insurance, etc.)<br>'+
'= <strong>Net Taxable Income</strong><br>'+
'Tax = Apply progressive rates above</div>'
},
{id:'help-tax-separation',category:'tax',badge:'law',
title:'Tax on Separation Income — §48(5)',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f LAW \u2014 Revenue Code, Section 48(5) & Ministerial Regulation No. 126</div>'+
'<p>Separation payments (severance, notice pay, leave cash-out) receive <strong>special tax treatment</strong> that is more favourable than normal income tax.</p>'+
'<h4 style="font-size:11px;font-weight:600;margin:10px 0 4px">Tax-Exempt Portion</h4>'+
'<p>Severance pay is <strong>tax-exempt</strong> up to the greater of:</p>'+
'<ul style="padding-left:18px;margin:6px 0">'+
'<li>300 days\u2019 wages (based on last rate of pay), OR</li>'+
'<li>\u0e3f300,000</li>'+
'</ul>'+
'<p>Whichever amount is <strong>higher</strong> is the exempt threshold.</p>'+
'<h4 style="font-size:11px;font-weight:600;margin:10px 0 4px">Taxable Portion — Half-Rate Method</h4>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:6px 0">'+
'<strong>Step 1:</strong> Taxable separation = Total separation \u2212 Exempt portion<br>'+
'<strong>Step 2:</strong> Expense deduction = \u0e3f7,000 \u00d7 Years of Service<br>'+
'<strong>Step 3:</strong> Net = Taxable separation \u2212 Expense deduction<br>'+
'<strong>Step 4:</strong> Divide Net by Years of Service<br>'+
'<strong>Step 5:</strong> Apply progressive tax rates to the per-year amount<br>'+
'<strong>Step 6:</strong> Tax per year \u00d7 Years of Service \u00f7 2 = <strong>Final Tax</strong><br>'+
'(the "\u00f7 2" is the half-rate benefit)<br><br>'+
'<strong>Example:</strong> 12 yrs service, \u0e3f900,000 total separation<br>'+
'Exempt = max(300 days \u00d7 \u0e3f2,086 = \u0e3f625,800 vs \u0e3f300,000) = \u0e3f625,800<br>'+
'Taxable = 900,000 \u2212 625,800 = \u0e3f274,200<br>'+
'Expense = 7,000 \u00d7 12 = \u0e3f84,000<br>'+
'Net = 274,200 \u2212 84,000 = \u0e3f190,200<br>'+
'Per year = 190,200 \u00f7 12 = \u0e3f15,850<br>'+
'Tax on \u0e3f15,850 = \u0e3f0 (under \u0e3f150,000 exempt)<br>'+
'Final tax = <strong>\u0e3f0</strong></div>'+
'<p style="font-size:10px;color:var(--text3)">This method is filed separately from regular annual income. The employer withholds at source and the employee does not need to add separation income to their regular PND.91 filing.</p>'
},
{id:'help-tax-exemptions',category:'tax',badge:'law',
title:'Tax Exemptions & Deductions Catalog',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f LAW \u2014 Revenue Code & 2026 Regulations</div>'+
'<table class="tbl" style="margin:10px 0;font-size:10px"><thead><tr><th>Exemption</th><th class="r">Max (\u0e3f)</th><th>Details & Conditions</th></tr></thead><tbody>'+
'<tr><td><strong>Personal Allowance</strong></td><td class="r">60,000</td><td>Every taxpayer. No conditions.</td></tr>'+
'<tr><td><strong>Spouse Allowance</strong></td><td class="r">60,000</td><td>Spouse with no income or files jointly.</td></tr>'+
'<tr><td><strong>Child Allowance</strong></td><td class="r">30,000/child</td><td>Legitimate children. 2nd child born 2018+ gets \u0e3f60,000. Max unlimited children.</td></tr>'+
'<tr><td><strong>Parental Care</strong></td><td class="r">30,000/person</td><td>Parents aged 60+ with income under \u0e3f30,000/yr. Max 4 persons (yours + spouse\'s).</td></tr>'+
'<tr><td><strong>Disability Care</strong></td><td class="r">60,000</td><td>Caring for a disabled family member.</td></tr>'+
'<tr style="background:var(--bg3)"><td colspan="3"><strong>\u2014 Employment Deductions \u2014</strong></td></tr>'+
'<tr><td><strong>Expense Deduction</strong></td><td class="r">100,000</td><td>50% of employment income, max \u0e3f100,000. Auto-calculated.</td></tr>'+
'<tr style="background:var(--bg3)"><td colspan="3"><strong>\u2014 Insurance & Savings \u2014</strong></td></tr>'+
'<tr><td><strong>Life Insurance Premium</strong></td><td class="r">100,000</td><td>Premiums paid to Thai-licensed insurer. Policy must be 10+ years. Combined with health insurance max \u0e3f100,000.</td></tr>'+
'<tr><td><strong>Health Insurance</strong></td><td class="r">25,000</td><td>Self only. Combined with life insurance cannot exceed \u0e3f100,000 total.</td></tr>'+
'<tr><td><strong>Spouse Life Insurance</strong></td><td class="r">10,000</td><td>Premiums for spouse\'s life insurance if spouse has no income.</td></tr>'+
'<tr><td><strong>Parents\' Health Insurance</strong></td><td class="r">15,000</td><td>Per parent. Parent income under \u0e3f30,000/yr.</td></tr>'+
'<tr><td><strong>Social Security (SSO)</strong></td><td class="r">10,500</td><td>Section 33: 5% of wages, ceiling \u0e3f17,500 (2026\u20132028). Max \u0e3f875/month = \u0e3f10,500/year.</td></tr>'+
'<tr><td><strong>Provident Fund (PVD)</strong></td><td class="r">500,000</td><td>Employee contribution, max 15% of salary. Amount exceeding \u0e3f10,000 is deductible up to \u0e3f490,000.</td></tr>'+
'<tr style="background:var(--bg3)"><td colspan="3"><strong>\u2014 Investment Funds (combined max \u0e3f500,000) \u2014</strong></td></tr>'+
'<tr><td><strong>RMF (Retirement Mutual Fund)</strong></td><td class="r">500,000</td><td>Max 30% of assessable income. Must invest continuously until age 55. Combined with PVD, SSF, Thai ESG cannot exceed \u0e3f500,000.</td></tr>'+
'<tr><td><strong>SSF (Super Savings Fund)</strong></td><td class="r">200,000</td><td>Max 30% of assessable income, max \u0e3f200,000. Hold 10+ years. Combined with RMF, PVD, Thai ESG cannot exceed \u0e3f500,000.</td></tr>'+
'<tr><td><strong>Thai ESG Fund</strong></td><td class="r">300,000</td><td>Max 30% of assessable income, max \u0e3f300,000. Hold 8+ years (bought 2024\u20132026). Combined cap \u0e3f500,000 with RMF/SSF/PVD.</td></tr>'+
'<tr style="background:var(--bg3)"><td colspan="3"><strong>\u2014 Property & Donations \u2014</strong></td></tr>'+
'<tr><td><strong>Home Loan Interest</strong></td><td class="r">100,000</td><td>Interest on mortgage for self-occupied property. Lender must be Thai financial institution. Multiple co-borrowers: split \u0e3f100,000 cap equally.</td></tr>'+
'<tr><td><strong>First Home Buyer</strong></td><td class="r">200,000</td><td>House value up to \u0e3f5M. Deduct 20% over 5 years.</td></tr>'+
'<tr><td><strong>General Donation</strong></td><td class="r">10% of net</td><td>Donations to qualified charities, temples, hospitals.</td></tr>'+
'<tr><td><strong>Education Donation</strong></td><td class="r">2x amount</td><td>Donations to approved educational institutions. 2x deduction, combined with general max 10%.</td></tr>'+
'<tr><td><strong>Political Party Donation</strong></td><td class="r">10,000</td><td>Donations to registered political parties.</td></tr>'+
'<tr style="background:var(--bg3)"><td colspan="3"><strong>\u2014 Stimulus Measures \u2014</strong></td></tr>'+
'<tr><td><strong>Easy E-Receipt</strong></td><td class="r">50,000</td><td>Purchases with e-tax invoice/e-receipt during qualifying period.</td></tr>'+
'<tr><td><strong>Domestic Travel</strong></td><td class="r">15,000</td><td>Hotel accommodation in Thailand during qualifying period.</td></tr>'+
'</tbody></table>'+
'<div style="font-size:9px;color:var(--text3);margin-top:4px"><strong>Note:</strong> Combined cap for RMF + SSF + Thai ESG + PVD = \u0e3f500,000. Life + Health insurance combined max \u0e3f100,000. Always verify with the Revenue Department or a tax advisor.</div>'
},
// ═══════════════════════════════════════════════
// 🛡️ SOCIAL SECURITY
// ═══════════════════════════════════════════════
{id:'help-sso-contributions',category:'social-security',badge:'law',
title:'SSO Contribution Rules',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f LAW \u2014 Social Security Act B.E. 2533, Section 33</div>'+
'<p><strong>Legal Basis:</strong> Social Security Act B.E. 2533 (1990), Section 33<br>'+
'<strong>Governing Body:</strong> Social Security Office (SSO), Ministry of Labour<br>'+
'<strong>Applies to:</strong> All private-sector employees aged 15\u201360, including foreign workers with work permits</p>'+
'<h4 style="font-size:11px;font-weight:600;margin:10px 0 4px">Contribution Rate</h4>'+
'<table class="tbl" style="margin:6px 0"><thead><tr><th>Party</th><th class="r">Rate</th><th>Notes</th></tr></thead><tbody>'+
'<tr><td>Employee</td><td class="r" style="font-family:var(--mono)">5%</td><td>Deducted from salary each month</td></tr>'+
'<tr><td>Employer</td><td class="r" style="font-family:var(--mono)">5%</td><td>Matching contribution, paid separately</td></tr>'+
'<tr><td>Government</td><td class="r" style="font-family:var(--mono)">2.75%</td><td>Paid by the state</td></tr>'+
'</tbody></table>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:10px 0">'+
'<strong>Contribution Base</strong> = min(Monthly Salary, Wage Ceiling)<br>'+
'<strong>Employee SSO</strong> = Contribution Base \u00d7 5%<br>'+
'<strong>Cap Rule:</strong> If salary \u2265 \u0e3f17,500 \u2192 contribution = \u0e3f875 (max)<br>'+
'<strong>Floor Rule:</strong> If salary &lt; \u0e3f1,650 \u2192 uses \u0e3f1,650 floor<br><br>'+
'<strong>Examples (2026):</strong><br>'+
'Salary \u0e3f10,000 \u2192 10,000 \u00d7 5% = <strong>\u0e3f500</strong><br>'+
'Salary \u0e3f15,000 \u2192 15,000 \u00d7 5% = <strong>\u0e3f750</strong><br>'+
'Salary \u0e3f17,500 \u2192 17,500 \u00d7 5% = <strong>\u0e3f875</strong> (at ceiling)<br>'+
'Salary \u0e3f62,566 \u2192 17,500 \u00d7 5% = <strong>\u0e3f875</strong> (capped)</div>'
},
{id:'help-sso-ceiling',category:'social-security',badge:'law',
title:'Wage Ceiling Reform (Multi-Year)',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f LAW \u2014 Ministerial Regulation, Royal Gazette 12 Dec 2025</div>'+
'<table class="tbl" style="margin:10px 0"><thead><tr><th>Phase</th><th>Period</th><th class="r">Wage Ceiling</th><th class="r">Max/party</th><th class="r">Total Max</th></tr></thead><tbody>'+
'<tr><td><span class="tag tag-finished">Old</span></td><td>Before 2026</td><td class="r" style="font-family:var(--mono)">\u0e3f15,000</td><td class="r" style="font-family:var(--mono)">\u0e3f750</td><td class="r" style="font-family:var(--mono)">\u0e3f1,500</td></tr>'+
'<tr style="background:var(--success-bg)"><td><span class="tag tag-active">Phase 1</span></td><td>Jan 2026 \u2013 Dec 2028</td><td class="r" style="font-family:var(--mono)">\u0e3f17,500</td><td class="r" style="font-family:var(--mono)">\u0e3f875</td><td class="r" style="font-family:var(--mono)">\u0e3f1,750</td></tr>'+
'<tr><td><span class="tag tag-planned">Phase 2</span></td><td>Jan 2029 \u2013 Dec 2031</td><td class="r" style="font-family:var(--mono)">\u0e3f20,000</td><td class="r" style="font-family:var(--mono)">\u0e3f1,000</td><td class="r" style="font-family:var(--mono)">\u0e3f2,000</td></tr>'+
'<tr><td><span class="tag tag-planned">Phase 3</span></td><td>From Jan 2032</td><td class="r" style="font-family:var(--mono)">\u0e3f23,000</td><td class="r" style="font-family:var(--mono)">\u0e3f1,150</td><td class="r" style="font-family:var(--mono)">\u0e3f2,300</td></tr>'+
'</tbody></table>'+
'<p style="font-size:10px;color:var(--text3)">Minimum wage floor: \u0e3f1,650/month. Published in Royal Gazette: 12 Dec 2025.</p>'
},
{id:'help-sso-unemployment',category:'social-security',badge:'law',
title:'Unemployment Benefit',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f LAW \u2014 Social Security Act B.E. 2533, Chapter 7 (Unemployment)</div>'+
'<p>SSO provides unemployment insurance for Section 33 insured persons who lose their jobs. Benefits depend on the <strong>reason for separation</strong>:</p>'+
'<table class="tbl" style="margin:10px 0"><thead><tr><th>Reason</th><th class="r">Benefit Rate</th><th class="r">Max Duration</th></tr></thead><tbody>'+
'<tr style="background:var(--success-bg)"><td><strong>Dismissed / Laid off</strong></td><td class="r" style="font-family:var(--mono)">50%</td><td class="r" style="font-family:var(--mono)">180 days (6 months)</td></tr>'+
'<tr><td>Resigned / End of contract</td><td class="r" style="font-family:var(--mono)">30%</td><td class="r" style="font-family:var(--mono)">90 days (3 months)</td></tr>'+
'</tbody></table>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:10px 0">'+
'<strong>Salary cap for calculation:</strong> \u0e3f17,500 (2026+)<br><br>'+
'<strong>Example \u2014 Dismissed:</strong><br>'+
'Salary \u0e3f62,566 \u2192 capped at \u0e3f17,500<br>'+
'Monthly benefit = 17,500 \u00d7 50% = <strong>\u0e3f8,750/month</strong><br>'+
'Duration: up to 6 months = <strong>\u0e3f52,500 total</strong><br><br>'+
'<strong>Example \u2014 Resigned:</strong><br>'+
'Monthly benefit = 17,500 \u00d7 30% = <strong>\u0e3f5,250/month</strong><br>'+
'Duration: up to 3 months = <strong>\u0e3f15,750 total</strong></div>'+
'<h4 style="font-size:11px;font-weight:600;margin:10px 0 4px">How to Claim</h4>'+
'<ul style="padding-left:18px;margin:6px 0">'+
'<li>Register at the <strong>Department of Employment</strong> (\u0e01\u0e23\u0e21\u0e01\u0e32\u0e23\u0e08\u0e31\u0e14\u0e2b\u0e32\u0e07\u0e32\u0e19) within <strong>30 days</strong> of termination</li>'+
'<li>Must have contributed to SSO for at least <strong>6 of the last 15 months</strong></li>'+
'<li>Must report to the employment office <strong>monthly</strong> and show job-seeking effort</li>'+
'<li>Benefit is paid via bank transfer</li>'+
'</ul>'
},
{id:'help-sso-pension',category:'social-security',badge:'law',
title:'Old-Age Pension',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f LAW \u2014 Social Security Act B.E. 2533, Chapter 5 (Old-Age)</div>'+
'<p>SSO provides old-age benefits to insured persons who reach <strong>age 55</strong> and are no longer Section 33 members.</p>'+
'<h4 style="font-size:11px;font-weight:600;margin:10px 0 4px">Monthly Pension (180+ months contributions)</h4>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:6px 0">'+
'<strong>Eligibility:</strong> Age 55+ AND 180+ months (15 years) of SSO contributions<br><br>'+
'<strong>Formula:</strong><br>'+
'Base pension = 20% of average capped monthly earnings<br>'+
'+ 1.5% for every 12 months of contributions <strong>over 180 months</strong><br><br>'+
'<strong>Example:</strong> 25 years contributions (300 months), avg capped salary \u0e3f15,000<br>'+
'Base = 15,000 \u00d7 20% = \u0e3f3,000/mo<br>'+
'Extra months = 300 \u2212 180 = 120 months = 10 \u00d7 12<br>'+
'Extra = 15,000 \u00d7 1.5% \u00d7 10 = \u0e3f2,250/mo<br>'+
'Total pension = <strong>\u0e3f5,250/month</strong> (for life)</div>'+
'<h4 style="font-size:11px;font-weight:600;margin:10px 0 4px">Lump Sum Refund (Less than 180 months)</h4>'+
'<p>If you have <strong>less than 180 months</strong> of contributions when you turn 55:</p>'+
'<ul style="padding-left:18px;margin:6px 0">'+
'<li>Receive a <strong>one-time lump sum</strong> of your employee + employer old-age fund contributions</li>'+
'<li>Includes accumulated interest</li>'+
'<li>No monthly pension entitlement</li>'+
'</ul>'+
'<p style="font-size:10px;color:var(--text3)">With the 2026 wage ceiling of \u0e3f17,500, future pensioners will receive higher pensions. The average capped earnings used in the formula will increase with each phase of the reform.</p>'
},
{id:'help-sso-benefits',category:'social-security',badge:'law',
title:'SSO Benefits Summary (2026 Rates)',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f LAW \u2014 Social Security Act, Various Chapters</div>'+
'<table class="tbl" style="margin:10px 0"><thead><tr><th>Benefit</th><th class="r">Before 2026</th><th class="r">From Jan 2026</th></tr></thead><tbody>'+
'<tr><td>Sickness/Disability/Unemployment (mo.)</td><td class="r" style="font-family:var(--mono)">\u0e3f7,500</td><td class="r" style="font-family:var(--mono)">\u0e3f8,750</td></tr>'+
'<tr><td>Maternity/Childbirth (per birth)</td><td class="r" style="font-family:var(--mono)">\u0e3f22,500</td><td class="r" style="font-family:var(--mono)">\u0e3f26,250</td></tr>'+
'<tr><td>Death Lump-sum</td><td class="r" style="font-family:var(--mono)">\u0e3f90,000</td><td class="r" style="font-family:var(--mono)">\u0e3f105,000</td></tr>'+
'<tr><td>Pension (15 yrs)</td><td class="r" style="font-family:var(--mono)">\u0e3f3,000/mo</td><td class="r" style="font-family:var(--mono)">\u0e3f3,500/mo</td></tr>'+
'<tr><td>Pension (25+ yrs)</td><td class="r" style="font-family:var(--mono)">\u0e3f5,250/mo</td><td class="r" style="font-family:var(--mono)">\u0e3f6,125/mo</td></tr>'+
'</tbody></table>'
},
{id:'help-sso-compliance',category:'social-security',badge:'law',
title:'Key Compliance Points',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f LAW \u2014 Social Security Act B.E. 2533</div>'+
'<ul style="padding-left:18px;margin:8px 0;font-size:11px;line-height:1.7">'+
'<li>Contributions due by <strong>15th of the following month</strong></li>'+
'<li>Late penalty: <strong>2% per month</strong> surcharge</li>'+
'<li>Employee must be registered within <strong>30 days</strong> of start date</li>'+
'<li>Coverage starts from <strong>first day of employment</strong></li>'+
'<li>Foreign employees with work permits are <strong>not exempt</strong></li>'+
'</ul>'
},
{id:'help-sso-setup',category:'social-security',badge:'info',
title:'How to Set Up SSO in This App',
content:'<ol style="padding-left:18px;margin:8px 0;font-size:11px;line-height:1.7">'+
'<li>Go to <strong>Payroll</strong> tab</li>'+
'<li>For <strong>Income items</strong>: check the <strong>SSO</strong> checkbox on items included in SSO wage base</li>'+
'<li>For <strong>Social Security deduction</strong>: set Calc Mode to <strong>"% of SSO Base"</strong>, Rate = <strong>5%</strong>, Cap = <strong>\u0e3f875</strong></li>'+
'<li>The app calculates: min(SSO Base \u00d7 5%, \u0e3f875) each month</li>'+
'</ol>'+
'<p style="font-size:10px;color:var(--text3)">Note: Bonus/OT may or may not be in SSO base. Consult HR.</p>'
},
// ═══════════════════════════════════════════════
// 🏦 PROVIDENT FUND / EPF
// ═══════════════════════════════════════════════
{id:'help-pvd-overview',category:'provident-fund',badge:'regulation',
title:'How Provident Funds Work',
content:'<div class="help-badge help-badge-regulation">\ud83d\udcdc REGULATION \u2014 SEC (Securities and Exchange Commission) / Provident Fund Act B.E. 2530</div>'+
'<p>A <strong>Provident Fund (PVD / \u0e01\u0e2d\u0e07\u0e17\u0e38\u0e19\u0e2a\u0e33\u0e23\u0e2d\u0e07\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07\u0e0a\u0e35\u0e1e)</strong> is a voluntary employer-sponsored retirement savings plan.</p>'+
'<ul style="padding-left:18px;margin:8px 0">'+
'<li><strong>Employee contribution:</strong> A percentage of salary (2\u201315%) deducted monthly</li>'+
'<li><strong>Employer contribution:</strong> Matching or fixed percentage, as per fund rules</li>'+
'<li>Funds are managed by a <strong>licensed fund manager</strong> under SEC oversight</li>'+
'<li>The employee\'s own contributions are <strong>always 100% theirs</strong></li>'+
'<li>The employer\'s contributions vest according to a <strong>vesting schedule</strong></li>'+
'</ul>'+
'<p style="margin-top:8px">At DXC, the standard employee contribution is <strong>3%</strong> of base salary, with DXC matching <strong>3%</strong>. You can increase your contribution rate up to 15%.</p>'
},
{id:'help-pvd-vesting',category:'provident-fund',badge:'company',
title:'DXC Vesting Schedule',
content:'<div class="help-badge help-badge-company">\ud83c\udfe2 COMPANY \u2014 DXC Technology Provident Fund Rules</div>'+
'<p>The employer\'s contribution to the provident fund <strong>vests gradually</strong> based on your years of service at DXC:</p>'+
'<table class="tbl" style="margin:10px 0"><thead><tr><th>Years of Service</th><th class="r">Vesting %</th><th>You Receive</th></tr></thead><tbody>'+
'<tr><td>Less than 3 years</td><td class="r" style="font-family:var(--mono);color:var(--danger)">0%</td><td>Employee portion only</td></tr>'+
'<tr><td>3 years</td><td class="r" style="font-family:var(--mono)">20%</td><td>Your + 20% of employer portion</td></tr>'+
'<tr><td>4 years</td><td class="r" style="font-family:var(--mono)">40%</td><td>Your + 40% of employer portion</td></tr>'+
'<tr><td>5 years</td><td class="r" style="font-family:var(--mono)">60%</td><td>Your + 60% of employer portion</td></tr>'+
'<tr><td>6 years</td><td class="r" style="font-family:var(--mono)">80%</td><td>Your + 80% of employer portion</td></tr>'+
'<tr style="background:var(--success-bg)"><td><strong>7+ years</strong></td><td class="r" style="font-family:var(--mono)"><strong>100%</strong></td><td><strong>Full amount (employee + employer)</strong></td></tr>'+
'</tbody></table>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:10px 0">'+
'<strong>Example:</strong> 5 years service, Employee PVD balance \u0e3f200,000, Employer PVD balance \u0e3f200,000<br>'+
'Vesting = 60%<br>'+
'You receive: \u0e3f200,000 + (200,000 \u00d7 60%) = <strong>\u0e3f320,000</strong><br>'+
'Forfeited: \u0e3f80,000 (returns to employer\'s pool)</div>'
},
{id:'help-pvd-withdrawal',category:'provident-fund',badge:'law',
title:'Withdrawal Options & Tax Treatment',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f LAW \u2014 Revenue Code & Provident Fund Act</div>'+
'<div class="help-badge help-badge-company" style="margin-top:4px">\ud83c\udfe2 COMPANY \u2014 DXC fund administrator rules</div>'+
'<p style="margin-top:8px">When you leave employment, you have <strong>three options</strong> for your provident fund balance:</p>'+
'<table class="tbl" style="margin:10px 0"><thead><tr><th>Option</th><th>Description</th><th>Tax Treatment</th></tr></thead><tbody>'+
'<tr><td><strong>\ud83d\udcb5 Cash Out</strong></td><td>Receive the vested amount as a lump sum</td><td>Taxed if service &lt;5 years or age &lt;55. Tax-free if service \u22655 years AND age \u226555.</td></tr>'+
'<tr><td><strong>\ud83d\udd04 Transfer to RMF</strong></td><td>Roll over to a Retirement Mutual Fund</td><td><strong>Tax-free</strong> rollover. Must hold in RMF until age 55 to remain tax-exempt.</td></tr>'+
'<tr><td><strong>\ud83c\udfe6 Hold / Transfer</strong></td><td>Keep in the current fund or transfer to new employer\'s fund</td><td>No tax event. Money stays invested.</td></tr>'+
'</tbody></table>'+
'<h4 style="font-size:11px;font-weight:600;margin:10px 0 4px">Tax on Cash Out (Service &lt;5 years or Age &lt;55)</h4>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:6px 0">'+
'Employer portion + returns: taxed as \u00a748(5) separation income<br>'+
'Employee portion: not taxed (already taxed when earned)<br>'+
'Investment returns on employee portion: taxed as \u00a740(8) income</div>'+
'<p style="font-size:10px;color:var(--text3)">Recommendation: If eligible (\u22655 years service), strongly consider RMF transfer for tax efficiency. Consult with the fund administrator and a tax advisor.</p>'
},
// ═══════════════════════════════════════════════
// 🏢 COMPANY BENEFITS (DXC)
// ═══════════════════════════════════════════════
{id:'help-dxc-aip',category:'company-benefits',badge:'company',
title:'AIP Bonus (Annual Incentive Plan)',
content:'<div class="help-badge help-badge-company">\ud83c\udfe2 COMPANY \u2014 DXC Technology AIP Policy</div>'+
'<p>The <strong>Annual Incentive Plan (AIP)</strong> is a performance-based annual bonus paid to eligible employees.</p>'+
'<ul style="padding-left:18px;margin:8px 0">'+
'<li><strong>Target:</strong> Varies by grade level (typically 5\u201320% of annual base salary)</li>'+
'<li><strong>Payout factors:</strong> Company performance \u00d7 Business unit performance \u00d7 Individual performance</li>'+
'<li><strong>Payment timing:</strong> Typically March of the following fiscal year</li>'+
'<li><strong>Pro-ration:</strong> For mid-year joiners, AIP is pro-rated by months of service in the fiscal year</li>'+
'<li><strong>Separation:</strong> Generally, must be employed on the payout date to receive AIP. Check your specific terms.</li>'+
'</ul>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:10px 0">'+
'<strong>Example:</strong> Base \u0e3f62,566/mo, AIP target 10%<br>'+
'Annual base = 62,566 \u00d7 12 = \u0e3f750,792<br>'+
'AIP at 100% = 750,792 \u00d7 10% = <strong>\u0e3f75,079</strong><br>'+
'With 120% company multiplier = <strong>\u0e3f90,095</strong></div>'
},
{id:'help-dxc-13th',category:'company-benefits',badge:'company',
title:'13th Month Salary',
content:'<div class="help-badge help-badge-company">\ud83c\udfe2 COMPANY \u2014 DXC Technology Thailand Policy</div>'+
'<p>DXC Thailand pays a <strong>13th month salary</strong> (also called year-end bonus) to eligible employees.</p>'+
'<ul style="padding-left:18px;margin:8px 0">'+
'<li><strong>Amount:</strong> 1 month\'s base salary</li>'+
'<li><strong>Payment timing:</strong> December payroll</li>'+
'<li><strong>Pro-ration:</strong> New employees joining mid-year receive pro-rated amount based on months of service</li>'+
'<li><strong>Tax treatment:</strong> Taxed as regular employment income in the month received</li>'+
'</ul>'
},
{id:'help-dxc-leave',category:'company-benefits',badge:'company',
title:'DXC Leave Entitlement',
content:'<div class="help-badge help-badge-company">\ud83c\udfe2 COMPANY \u2014 DXC Technology Leave Policy</div>'+
'<table class="tbl" style="margin:10px 0"><thead><tr><th>Leave Type</th><th class="r">Entitlement</th><th>Conditions</th></tr></thead><tbody>'+
'<tr style="background:var(--bg3)"><td colspan="3"><strong>\u2014 Annual Leave \u2014</strong></td></tr>'+
'<tr><td>Service &lt; 5 years</td><td class="r" style="font-family:var(--mono)">15 days/year</td><td>Pro-rated in first year</td></tr>'+
'<tr><td>Service 5\u201310 years</td><td class="r" style="font-family:var(--mono)">17 days/year</td><td>\u2014</td></tr>'+
'<tr><td>Service 10+ years</td><td class="r" style="font-family:var(--mono)">20 days/year</td><td>\u2014</td></tr>'+
'<tr style="background:var(--bg3)"><td colspan="3"><strong>\u2014 Other Leave \u2014</strong></td></tr>'+
'<tr><td>Sick Leave</td><td class="r" style="font-family:var(--mono)">30 days/year</td><td>Paid. Doctor\'s note for 3+ consecutive days.</td></tr>'+
'<tr><td>Personal Leave</td><td class="r" style="font-family:var(--mono)">3 days/year</td><td>Paid. Non-accumulating.</td></tr>'+
'<tr><td>Maternity Leave</td><td class="r" style="font-family:var(--mono)">98 days</td><td>Employer pays 45 days, SSO pays 45 days.</td></tr>'+
'</tbody></table>'+
'<p style="font-size:10px;color:var(--text3)">Annual leave can carry over to next year per company policy. Unused annual leave is cashed out on termination. Other leave types are not cashed out.</p>'
},
// ═══════════════════════════════════════════════
// 📊 APP FEATURES
// ═══════════════════════════════════════════════
{id:'help-app-simulation',category:'app-features',badge:'info',
title:'Simulation Period',
content:'<p>The simulation period controls how many months the app projects into the future.</p>'+
'<ul style="padding-left:18px;margin:8px 0">'+
'<li><strong>Range:</strong> 1 to 60 months (5 years)</li>'+
'<li><strong>Default:</strong> 12 months</li>'+
'<li>Longer periods are useful for retirement planning and long-term cash flow projection</li>'+
'<li>The app applies annual salary increases, SSO ceiling changes, and tax bracket shifts automatically</li>'+
'</ul>'
},
{id:'help-app-export',category:'app-features',badge:'info',
title:'Export / Import',
content:'<p>Save and restore your complete payroll profile.</p>'+
'<ul style="padding-left:18px;margin:8px 0">'+
'<li><strong>Export:</strong> Downloads your entire profile as a JSON file. Includes all income items, deductions, personal details, and settings.</li>'+
'<li><strong>Import:</strong> Upload a previously exported JSON file to restore your profile.</li>'+
'<li><strong>Privacy:</strong> Files are saved locally. No data is uploaded to any server.</li>'+
'<li><strong>Sharing:</strong> You can share the JSON file with colleagues for comparison or auditing.</li>'+
'</ul>'
},
{id:'help-app-sources',category:'app-features',badge:'info',
title:'Sources & References',
content:'<ul style="font-size:10px;line-height:1.6;color:var(--text3);padding-left:18px">'+
'<li>Thai Labour Protection Act B.E. 2541 (1998), Sections 17, 67, 118, 119, 122</li>'+
'<li>Social Security Act B.E. 2533 (1990), Section 33</li>'+
'<li>Thai Revenue Code, Sections 48, 50</li>'+
'<li>Provident Fund Act B.E. 2530 (1987)</li>'+
'<li>Ministerial Regulation, Royal Gazette, 12 Dec 2025 (SSO ceiling reform)</li>'+
'<li><a href="https://omnihr.co/blog/sso-thailand" target="_blank" style="color:var(--primary)">OmniHR: SSO Thailand Guide (2026)</a></li>'+
'<li><a href="https://www.thailawonline.com/social-security-in-thailand-changes-for-the-next-years/" target="_blank" style="color:var(--primary)">ThaiLawOnline (2026)</a></li>'+
'<li><a href="https://kpmg.com/th/en/insights/2026/01/th-tax-news-flash-issue-157.html" target="_blank" style="color:var(--primary)">KPMG Thailand Tax Flash</a></li>'+
'</ul>'
}
]},
// ═══════════════════════════════════════════════
// THAI (TH)
// ═══════════════════════════════════════════════
th:{
title:'\u0e04\u0e39\u0e48\u0e21\u0e37\u0e2d\u0e41\u0e25\u0e30\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e2d\u0e49\u0e32\u0e07\u0e2d\u0e34\u0e07',
searchPlaceholder:'\u0e04\u0e49\u0e19\u0e2b\u0e32\u0e2b\u0e31\u0e27\u0e02\u0e49\u0e2d\u0e0a\u0e48\u0e27\u0e22\u0e40\u0e2b\u0e25\u0e37\u0e2d...',
tocTitle:'\u0e2a\u0e32\u0e23\u0e1a\u0e31\u0e0d',
noResults:'\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e2b\u0e31\u0e27\u0e02\u0e49\u0e2d\u0e17\u0e35\u0e48\u0e15\u0e23\u0e07\u0e01\u0e31\u0e1a',
sections:[
{id:'help-overview',category:'getting-started',badge:'info',
title:'\u0e20\u0e32\u0e1e\u0e23\u0e27\u0e21\u0e02\u0e2d\u0e07\u0e41\u0e2d\u0e1b',
content:'<p><strong>Cash Flow Planner</strong> \u0e40\u0e1b\u0e47\u0e19\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e21\u0e37\u0e2d\u0e27\u0e32\u0e07\u0e41\u0e1c\u0e19\u0e01\u0e32\u0e23\u0e40\u0e07\u0e34\u0e19\u0e2a\u0e48\u0e27\u0e19\u0e1a\u0e38\u0e04\u0e04\u0e25 \u0e2d\u0e2d\u0e01\u0e41\u0e1a\u0e1a\u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a\u0e1e\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19\u0e43\u0e19\u0e1b\u0e23\u0e30\u0e40\u0e17\u0e28\u0e44\u0e17\u0e22 \u0e08\u0e33\u0e25\u0e2d\u0e07\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19 \u0e01\u0e32\u0e23\u0e2b\u0e31\u0e01\u0e15\u0e32\u0e21\u0e01\u0e0e\u0e2b\u0e21\u0e32\u0e22 (\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21 \u0e20\u0e32\u0e29\u0e35 \u0e01\u0e2d\u0e07\u0e17\u0e38\u0e19\u0e2a\u0e33\u0e23\u0e2d\u0e07\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07\u0e0a\u0e35\u0e1e) \u0e41\u0e25\u0e30\u0e2a\u0e27\u0e31\u0e2a\u0e14\u0e34\u0e01\u0e32\u0e23\u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17</p>'+
'<p style="margin-top:8px"><strong>\u0e04\u0e27\u0e32\u0e21\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e2b\u0e25\u0e31\u0e01:</strong></p>'+
'<ul style="padding-left:18px;margin:6px 0"><li>\u0e04\u0e33\u0e19\u0e27\u0e13\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e44\u0e17\u0e22\u0e41\u0e21\u0e48\u0e19\u0e22\u0e33\u0e1e\u0e23\u0e49\u0e2d\u0e21\u0e40\u0e1e\u0e14\u0e32\u0e19\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21\u0e41\u0e25\u0e30\u0e2d\u0e31\u0e15\u0e23\u0e32\u0e20\u0e32\u0e29\u0e35\u0e01\u0e49\u0e32\u0e27\u0e2b\u0e19\u0e49\u0e32</li><li>\u0e27\u0e32\u0e07\u0e41\u0e1c\u0e19\u0e01\u0e23\u0e13\u0e35\u0e2a\u0e34\u0e49\u0e19\u0e2a\u0e38\u0e14\u0e01\u0e32\u0e23\u0e08\u0e49\u0e32\u0e07\u0e07\u0e32\u0e19 (\u0e04\u0e48\u0e32\u0e0a\u0e14\u0e40\u0e0a\u0e22 \u0e04\u0e48\u0e32\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14 \u0e04\u0e48\u0e32\u0e1a\u0e2d\u0e01\u0e01\u0e25\u0e48\u0e32\u0e27\u0e25\u0e48\u0e27\u0e07\u0e2b\u0e19\u0e49\u0e32)</li><li>\u0e40\u0e1b\u0e23\u0e35\u0e22\u0e1a\u0e40\u0e17\u0e35\u0e22\u0e1a\u0e01\u0e2d\u0e07\u0e17\u0e38\u0e19\u0e2a\u0e33\u0e23\u0e2d\u0e07\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07\u0e0a\u0e35\u0e1e\u0e41\u0e25\u0e30\u0e15\u0e31\u0e27\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e01\u0e32\u0e23\u0e16\u0e2d\u0e19</li><li>\u0e41\u0e2a\u0e14\u0e07\u0e1c\u0e25\u0e40\u0e1b\u0e47\u0e19\u0e01\u0e23\u0e32\u0e1f\u0e44\u0e17\u0e21\u0e4c\u0e44\u0e25\u0e19\u0e4c</li><li>\u0e42\u0e21\u0e14\u0e39\u0e25\u0e40\u0e01\u0e29\u0e35\u0e22\u0e13\u0e2d\u0e32\u0e22\u0e38</li><li>\u0e2a\u0e48\u0e07\u0e2d\u0e2d\u0e01/\u0e19\u0e33\u0e40\u0e02\u0e49\u0e32\u0e42\u0e1b\u0e23\u0e44\u0e1f\u0e25\u0e4c\u0e40\u0e1b\u0e47\u0e19 JSON</li></ul>'+
'<p style="margin-top:8px;font-size:10px;color:var(--text3)">\u0e41\u0e2d\u0e1b\u0e19\u0e35\u0e49\u0e17\u0e33\u0e07\u0e32\u0e19\u0e43\u0e19\u0e40\u0e1a\u0e23\u0e32\u0e27\u0e4c\u0e40\u0e0b\u0e2d\u0e23\u0e4c\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14 \u0e44\u0e21\u0e48\u0e21\u0e35\u0e01\u0e32\u0e23\u0e2a\u0e48\u0e07\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e44\u0e1b\u0e22\u0e31\u0e07\u0e40\u0e0b\u0e34\u0e23\u0e4c\u0e1f\u0e40\u0e27\u0e2d\u0e23\u0e4c\u0e43\u0e14\u0e46</p>'
},
{id:'help-payroll-tab',category:'getting-started',badge:'info',
title:'\u0e27\u0e34\u0e18\u0e35\u0e43\u0e0a\u0e49\u0e07\u0e32\u0e19: \u0e41\u0e17\u0e47\u0e1a Payroll',
content:'<p>\u0e41\u0e17\u0e47\u0e1a <strong>Payroll</strong> \u0e43\u0e0a\u0e49\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e42\u0e04\u0e23\u0e07\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e23\u0e32\u0e22\u0e44\u0e14\u0e49\u0e41\u0e25\u0e30\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e2b\u0e31\u0e01\u0e23\u0e32\u0e22\u0e40\u0e14\u0e37\u0e2d\u0e19</p>'+
'<ol style="padding-left:18px;margin:8px 0">'+
'<li><strong>\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e23\u0e32\u0e22\u0e44\u0e14\u0e49</strong> \u2014 \u0e40\u0e1e\u0e34\u0e48\u0e21\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e1e\u0e37\u0e49\u0e19\u0e10\u0e32\u0e19 \u0e04\u0e48\u0e32\u0e40\u0e1a\u0e35\u0e49\u0e22\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07 OT \u0e42\u0e1a\u0e19\u0e31\u0e2a \u0e41\u0e15\u0e48\u0e25\u0e30\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e15\u0e34\u0e01\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e2b\u0e21\u0e32\u0e22 SSO \u0e41\u0e25\u0e30 Tax</li>'+
'<li><strong>\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e2b\u0e31\u0e01</strong> \u2014 \u0e40\u0e1e\u0e34\u0e48\u0e21\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21 \u0e01\u0e2d\u0e07\u0e17\u0e38\u0e19\u0e2a\u0e33\u0e23\u0e2d\u0e07\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07\u0e0a\u0e35\u0e1e \u0e20\u0e32\u0e29\u0e35 \u0e40\u0e25\u0e37\u0e2d\u0e01\u0e42\u0e2b\u0e21\u0e14\u0e04\u0e33\u0e19\u0e27\u0e13\u0e44\u0e14\u0e49</li>'+
'<li><strong>\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e04\u0e23\u0e31\u0e49\u0e07\u0e40\u0e14\u0e35\u0e22\u0e27</strong> \u2014 \u0e42\u0e1a\u0e19\u0e31\u0e2a \u0e40\u0e14\u0e37\u0e2d\u0e19\u0e17\u0e35\u0e48 13 AIP \u0e01\u0e33\u0e2b\u0e19\u0e14\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e17\u0e35\u0e48\u0e08\u0e48\u0e32\u0e22</li>'+
'<li><strong>\u0e42\u0e1b\u0e23\u0e44\u0e1f\u0e25\u0e4c</strong> \u2014 \u0e15\u0e31\u0e49\u0e07\u0e27\u0e31\u0e19\u0e40\u0e23\u0e34\u0e48\u0e21\u0e07\u0e32\u0e19 \u0e27\u0e31\u0e19\u0e40\u0e01\u0e34\u0e14 \u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19 \u0e0a\u0e37\u0e48\u0e2d\u0e19\u0e32\u0e22\u0e08\u0e49\u0e32\u0e07</li>'+
'</ol>'
},
{id:'help-timeline-tab',category:'getting-started',badge:'info',
title:'\u0e27\u0e34\u0e18\u0e35\u0e43\u0e0a\u0e49\u0e07\u0e32\u0e19: \u0e41\u0e17\u0e47\u0e1a Timeline',
content:'<p>\u0e41\u0e17\u0e47\u0e1a <strong>Timeline</strong> \u0e41\u0e2a\u0e14\u0e07\u0e1b\u0e23\u0e30\u0e21\u0e32\u0e13\u0e01\u0e32\u0e23\u0e01\u0e32\u0e23\u0e40\u0e07\u0e34\u0e19\u0e23\u0e32\u0e22\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e40\u0e1b\u0e47\u0e19\u0e01\u0e23\u0e32\u0e1f\u0e1e\u0e37\u0e49\u0e19\u0e17\u0e35\u0e48\u0e0b\u0e49\u0e2d\u0e19</p>'+
'<ul style="padding-left:18px;margin:8px 0">'+
'<li><strong>\u0e2a\u0e35\u0e40\u0e02\u0e35\u0e22\u0e27</strong> = \u0e40\u0e07\u0e34\u0e19\u0e2a\u0e38\u0e17\u0e18\u0e34\u0e2b\u0e25\u0e31\u0e07\u0e2b\u0e31\u0e01</li>'+
'<li><strong>\u0e2a\u0e35\u0e2a\u0e49\u0e21</strong> = \u0e20\u0e32\u0e29\u0e35</li>'+
'<li><strong>\u0e2a\u0e35\u0e1f\u0e49\u0e32</strong> = \u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21</li>'+
'<li><strong>\u0e2a\u0e35\u0e21\u0e48\u0e27\u0e07</strong> = \u0e01\u0e2d\u0e07\u0e17\u0e38\u0e19\u0e2a\u0e33\u0e23\u0e2d\u0e07\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07\u0e0a\u0e35\u0e1e</li>'+
'</ul>'+
'<p>\u0e40\u0e25\u0e37\u0e48\u0e2d\u0e19\u0e40\u0e21\u0e32\u0e2a\u0e4c\u0e44\u0e1b\u0e17\u0e35\u0e48\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e43\u0e14\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e14\u0e39\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14</p>'
},
{id:'help-retirement-tab',category:'getting-started',badge:'info',
title:'\u0e27\u0e34\u0e18\u0e35\u0e43\u0e0a\u0e49\u0e07\u0e32\u0e19: \u0e42\u0e21\u0e14\u0e39\u0e25\u0e40\u0e01\u0e29\u0e35\u0e22\u0e13\u0e2d\u0e32\u0e22\u0e38',
content:'<p>\u0e42\u0e21\u0e14\u0e39\u0e25 <strong>Retirement</strong> \u0e04\u0e32\u0e14\u0e01\u0e32\u0e23\u0e13\u0e4c\u0e2a\u0e16\u0e32\u0e19\u0e30\u0e01\u0e32\u0e23\u0e40\u0e07\u0e34\u0e19\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e40\u0e01\u0e29\u0e35\u0e22\u0e13\u0e2d\u0e32\u0e22\u0e38</p>'+
'<ul style="padding-left:18px;margin:8px 0">'+
'<li>\u0e15\u0e31\u0e49\u0e07\u0e2d\u0e32\u0e22\u0e38\u0e40\u0e01\u0e29\u0e35\u0e22\u0e13\u0e40\u0e1b\u0e49\u0e32\u0e2b\u0e21\u0e32\u0e22 (\u0e04\u0e48\u0e32\u0e40\u0e23\u0e34\u0e48\u0e21\u0e15\u0e49\u0e19 55 \u0e1b\u0e35)</li>'+
'<li>\u0e14\u0e39\u0e40\u0e07\u0e34\u0e19\u0e1a\u0e33\u0e19\u0e32\u0e0d SSO \u0e01\u0e2d\u0e07\u0e17\u0e38\u0e19\u0e2a\u0e33\u0e23\u0e2d\u0e07\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07\u0e0a\u0e35\u0e1e \u0e41\u0e25\u0e30\u0e40\u0e07\u0e34\u0e19\u0e2d\u0e2d\u0e21\u0e2a\u0e30\u0e2a\u0e21</li>'+
'<li>\u0e40\u0e1b\u0e23\u0e35\u0e22\u0e1a\u0e40\u0e17\u0e35\u0e22\u0e1a\u0e2a\u0e16\u0e32\u0e19\u0e01\u0e32\u0e23\u0e13\u0e4c: \u0e40\u0e01\u0e29\u0e35\u0e22\u0e13\u0e40\u0e23\u0e47\u0e27 vs \u0e17\u0e33\u0e07\u0e32\u0e19\u0e15\u0e48\u0e2d</li>'+
'</ul>'
},
{id:'help-sev118',category:'labour-law',badge:'law',
title:'\u0e04\u0e48\u0e32\u0e0a\u0e14\u0e40\u0e0a\u0e22 \u2014 \u0e21\u0e32\u0e15\u0e23\u0e32 118 \u0e1e.\u0e23.\u0e1a.\u0e04\u0e38\u0e49\u0e21\u0e04\u0e23\u0e2d\u0e07\u0e41\u0e23\u0e07\u0e07\u0e32\u0e19',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u0e01\u0e0e\u0e2b\u0e21\u0e32\u0e22 \u2014 \u0e1e.\u0e23.\u0e1a.\u0e04\u0e38\u0e49\u0e21\u0e04\u0e23\u0e2d\u0e07\u0e41\u0e23\u0e07\u0e07\u0e32\u0e19 \u0e1e.\u0e28. 2541 \u0e21\u0e32\u0e15\u0e23\u0e32 118</div>'+
'<p>\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e19\u0e32\u0e22\u0e08\u0e49\u0e32\u0e07\u0e40\u0e25\u0e34\u0e01\u0e08\u0e49\u0e32\u0e07\u0e25\u0e39\u0e01\u0e08\u0e49\u0e32\u0e07<strong>\u0e42\u0e14\u0e22\u0e44\u0e21\u0e48\u0e21\u0e35\u0e04\u0e27\u0e32\u0e21\u0e1c\u0e34\u0e14</strong> (\u0e44\u0e21\u0e48\u0e43\u0e0a\u0e48\u0e01\u0e23\u0e13\u0e35\u0e15\u0e32\u0e21 \u0e21.119) \u0e25\u0e39\u0e01\u0e08\u0e49\u0e32\u0e07\u0e21\u0e35\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e44\u0e14\u0e49\u0e23\u0e31\u0e1a\u0e04\u0e48\u0e32\u0e0a\u0e14\u0e40\u0e0a\u0e22\u0e15\u0e32\u0e21\u0e2d\u0e32\u0e22\u0e38\u0e07\u0e32\u0e19:</p>'+
'<table class="tbl" style="margin:10px 0"><thead><tr><th>\u0e2d\u0e32\u0e22\u0e38\u0e07\u0e32\u0e19</th><th class="r">\u0e04\u0e48\u0e32\u0e0a\u0e14\u0e40\u0e0a\u0e22 (\u0e27\u0e31\u0e19)</th></tr></thead><tbody>'+
'<tr><td>\u0e19\u0e49\u0e2d\u0e22\u0e01\u0e27\u0e48\u0e32 120 \u0e27\u0e31\u0e19</td><td class="r" style="font-family:var(--mono)">0 \u0e27\u0e31\u0e19</td></tr>'+
'<tr><td>120 \u0e27\u0e31\u0e19 \u2013 &lt; 1 \u0e1b\u0e35</td><td class="r" style="font-family:var(--mono)">30 \u0e27\u0e31\u0e19</td></tr>'+
'<tr><td>1 \u0e1b\u0e35 \u2013 &lt; 3 \u0e1b\u0e35</td><td class="r" style="font-family:var(--mono)">90 \u0e27\u0e31\u0e19</td></tr>'+
'<tr><td>3 \u0e1b\u0e35 \u2013 &lt; 6 \u0e1b\u0e35</td><td class="r" style="font-family:var(--mono)">180 \u0e27\u0e31\u0e19</td></tr>'+
'<tr><td>6 \u0e1b\u0e35 \u2013 &lt; 10 \u0e1b\u0e35</td><td class="r" style="font-family:var(--mono)">240 \u0e27\u0e31\u0e19</td></tr>'+
'<tr><td>10 \u0e1b\u0e35 \u2013 &lt; 20 \u0e1b\u0e35</td><td class="r" style="font-family:var(--mono)">300 \u0e27\u0e31\u0e19</td></tr>'+
'<tr style="background:var(--success-bg)"><td><strong>20 \u0e1b\u0e35\u0e02\u0e36\u0e49\u0e19\u0e44\u0e1b</strong></td><td class="r" style="font-family:var(--mono)"><strong>400 \u0e27\u0e31\u0e19</strong></td></tr>'+
'</tbody></table>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:10px 0">'+
'<strong>\u0e2a\u0e39\u0e15\u0e23:</strong><br>'+
'\u0e04\u0e48\u0e32\u0e08\u0e49\u0e32\u0e07\u0e23\u0e32\u0e22\u0e27\u0e31\u0e19 = \u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19 \u00f7 30<br>'+
'\u0e04\u0e48\u0e32\u0e0a\u0e14\u0e40\u0e0a\u0e22 = \u0e08\u0e33\u0e19\u0e27\u0e19\u0e27\u0e31\u0e19 \u00d7 \u0e04\u0e48\u0e32\u0e08\u0e49\u0e32\u0e07\u0e23\u0e32\u0e22\u0e27\u0e31\u0e19<br><br>'+
'<strong>\u0e15\u0e31\u0e27\u0e2d\u0e22\u0e48\u0e32\u0e07:</strong> \u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19 \u0e3f62,566 \u0e2d\u0e32\u0e22\u0e38\u0e07\u0e32\u0e19 12 \u0e1b\u0e35<br>'+
'\u0e04\u0e48\u0e32\u0e08\u0e49\u0e32\u0e07\u0e23\u0e32\u0e22\u0e27\u0e31\u0e19 = 62,566 \u00f7 30 = \u0e3f2,085.53<br>'+
'\u0e04\u0e48\u0e32\u0e0a\u0e14\u0e40\u0e0a\u0e22 = 300 \u00d7 2,085.53 = <strong>\u0e3f625,560</strong></div>'
},
{id:'help-sev122',category:'labour-law',badge:'law',
title:'\u0e04\u0e48\u0e32\u0e0a\u0e14\u0e40\u0e0a\u0e22\u0e1e\u0e34\u0e40\u0e28\u0e29 \u2014 \u0e21\u0e32\u0e15\u0e23\u0e32 122',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u0e01\u0e0e\u0e2b\u0e21\u0e32\u0e22 \u2014 \u0e1e.\u0e23.\u0e1a.\u0e04\u0e38\u0e49\u0e21\u0e04\u0e23\u0e2d\u0e07\u0e41\u0e23\u0e07\u0e07\u0e32\u0e19 \u0e21\u0e32\u0e15\u0e23\u0e32 122</div>'+
'<p>\u0e04\u0e48\u0e32\u0e0a\u0e14\u0e40\u0e0a\u0e22\u0e1e\u0e34\u0e40\u0e28\u0e29\u0e43\u0e0a\u0e49\u0e40\u0e09\u0e1e\u0e32\u0e30\u0e01\u0e23\u0e13\u0e35:</p>'+
'<ul style="padding-left:18px;margin:6px 0"><li>\u0e1b\u0e23\u0e31\u0e1a\u0e1b\u0e23\u0e38\u0e07\u0e42\u0e04\u0e23\u0e07\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e2d\u0e07\u0e04\u0e4c\u0e01\u0e23 \u0e22\u0e49\u0e32\u0e22\u0e2a\u0e16\u0e32\u0e19\u0e17\u0e35\u0e48\u0e17\u0e33\u0e07\u0e32\u0e19</li><li>\u0e19\u0e33\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e08\u0e31\u0e01\u0e23\u0e2b\u0e23\u0e37\u0e2d\u0e40\u0e17\u0e04\u0e42\u0e19\u0e42\u0e25\u0e22\u0e35\u0e21\u0e32\u0e43\u0e0a\u0e49\u0e17\u0e14\u0e41\u0e17\u0e19\u0e41\u0e23\u0e07\u0e07\u0e32\u0e19</li></ul>'+
'<p><strong>\u0e40\u0e07\u0e37\u0e48\u0e2d\u0e19\u0e44\u0e02:</strong> \u0e25\u0e39\u0e01\u0e08\u0e49\u0e32\u0e07\u0e15\u0e49\u0e2d\u0e07\u0e17\u0e33\u0e07\u0e32\u0e19\u0e15\u0e48\u0e2d\u0e40\u0e19\u0e37\u0e48\u0e2d\u0e07\u0e04\u0e23\u0e1a <strong>6 \u0e1b\u0e35\u0e02\u0e36\u0e49\u0e19\u0e44\u0e1b</strong></p>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:10px 0">'+
'<strong>\u0e2a\u0e39\u0e15\u0e23:</strong> 15 \u0e27\u0e31\u0e19 \u00d7 \u0e04\u0e48\u0e32\u0e08\u0e49\u0e32\u0e07\u0e23\u0e32\u0e22\u0e27\u0e31\u0e19 \u00d7 \u0e08\u0e33\u0e19\u0e27\u0e19\u0e1b\u0e35\u0e17\u0e33\u0e07\u0e32\u0e19\u0e40\u0e15\u0e47\u0e21<br>'+
'<strong>\u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14:</strong> 360 \u0e27\u0e31\u0e19</div>'+
'<p><strong>\u0e01\u0e32\u0e23\u0e41\u0e08\u0e49\u0e07\u0e25\u0e48\u0e27\u0e07\u0e2b\u0e19\u0e49\u0e32:</strong></p>'+
'<ul style="padding-left:18px;margin:6px 0">'+
'<li>\u0e15\u0e49\u0e2d\u0e07\u0e41\u0e08\u0e49\u0e07<strong>\u0e1e\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19\u0e15\u0e23\u0e27\u0e08\u0e41\u0e23\u0e07\u0e07\u0e32\u0e19</strong>\u0e25\u0e48\u0e27\u0e07\u0e2b\u0e19\u0e49\u0e32\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e19\u0e49\u0e2d\u0e22 <strong>60 \u0e27\u0e31\u0e19</strong></li>'+
'<li>\u0e15\u0e49\u0e2d\u0e07\u0e41\u0e08\u0e49\u0e07\u0e25\u0e39\u0e01\u0e08\u0e49\u0e32\u0e07\u0e25\u0e48\u0e27\u0e07\u0e2b\u0e19\u0e49\u0e32\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e19\u0e49\u0e2d\u0e22 <strong>60 \u0e27\u0e31\u0e19</strong></li>'+
'<li><strong>\u0e2b\u0e32\u0e01\u0e44\u0e21\u0e48\u0e41\u0e08\u0e49\u0e07:</strong> \u0e15\u0e49\u0e2d\u0e07\u0e08\u0e48\u0e32\u0e22\u0e04\u0e48\u0e32\u0e0a\u0e14\u0e40\u0e0a\u0e22\u0e1e\u0e34\u0e40\u0e28\u0e29\u0e41\u0e17\u0e19\u0e01\u0e32\u0e23\u0e1a\u0e2d\u0e01\u0e01\u0e25\u0e48\u0e32\u0e27\u0e25\u0e48\u0e27\u0e07\u0e2b\u0e19\u0e49\u0e32 (60 \u0e27\u0e31\u0e19)</li>'+
'</ul>'+
'<p style="font-size:10px;color:var(--text3)">\u0e04\u0e48\u0e32\u0e0a\u0e14\u0e40\u0e0a\u0e22\u0e1e\u0e34\u0e40\u0e28\u0e29\u0e19\u0e35\u0e49\u0e08\u0e48\u0e32\u0e22<em>\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e40\u0e15\u0e34\u0e21</em>\u0e08\u0e32\u0e01\u0e04\u0e48\u0e32\u0e0a\u0e14\u0e40\u0e0a\u0e22\u0e15\u0e32\u0e21\u0e21\u0e32\u0e15\u0e23\u0e32 118</p>'
},
{id:'help-notice17',category:'labour-law',badge:'law',
title:'\u0e04\u0e48\u0e32\u0e1a\u0e2d\u0e01\u0e01\u0e25\u0e48\u0e32\u0e27\u0e25\u0e48\u0e27\u0e07\u0e2b\u0e19\u0e49\u0e32 \u2014 \u0e21\u0e32\u0e15\u0e23\u0e32 17',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u0e01\u0e0e\u0e2b\u0e21\u0e32\u0e22 \u2014 \u0e1e.\u0e23.\u0e1a.\u0e04\u0e38\u0e49\u0e21\u0e04\u0e23\u0e2d\u0e07\u0e41\u0e23\u0e07\u0e07\u0e32\u0e19 \u0e21\u0e32\u0e15\u0e23\u0e32 17</div>'+
'<p>\u0e01\u0e32\u0e23\u0e40\u0e25\u0e34\u0e01\u0e08\u0e49\u0e32\u0e07\u0e2a\u0e31\u0e0d\u0e0d\u0e32\u0e08\u0e49\u0e32\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e23\u0e30\u0e22\u0e30\u0e40\u0e27\u0e25\u0e32 \u0e15\u0e49\u0e2d\u0e07\u0e21\u0e35<strong>\u0e01\u0e32\u0e23\u0e1a\u0e2d\u0e01\u0e01\u0e25\u0e48\u0e32\u0e27\u0e25\u0e48\u0e27\u0e07\u0e2b\u0e19\u0e49\u0e32\u0e40\u0e1b\u0e47\u0e19\u0e25\u0e32\u0e22\u0e25\u0e31\u0e01\u0e29\u0e13\u0e4c\u0e2d\u0e31\u0e01\u0e29\u0e23</strong></p>'+
'<ul style="padding-left:18px;margin:8px 0">'+
'<li>\u0e19\u0e32\u0e22\u0e08\u0e49\u0e32\u0e07\u0e15\u0e49\u0e2d\u0e07\u0e1a\u0e2d\u0e01\u0e01\u0e25\u0e48\u0e32\u0e27\u0e25\u0e48\u0e27\u0e07\u0e2b\u0e19\u0e49\u0e32\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e19\u0e49\u0e2d\u0e22 <strong>1 \u0e23\u0e2d\u0e1a\u0e01\u0e32\u0e23\u0e08\u0e48\u0e32\u0e22\u0e04\u0e48\u0e32\u0e08\u0e49\u0e32\u0e07</strong></li>'+
'<li>\u0e2b\u0e32\u0e01\u0e44\u0e21\u0e48\u0e1a\u0e2d\u0e01\u0e01\u0e25\u0e48\u0e32\u0e27: \u0e15\u0e49\u0e2d\u0e07\u0e08\u0e48\u0e32\u0e22<strong>\u0e04\u0e48\u0e32\u0e08\u0e49\u0e32\u0e07\u0e41\u0e17\u0e19\u0e01\u0e32\u0e23\u0e1a\u0e2d\u0e01\u0e01\u0e25\u0e48\u0e32\u0e27\u0e25\u0e48\u0e27\u0e07\u0e2b\u0e19\u0e49\u0e32</strong> \u0e40\u0e17\u0e48\u0e32\u0e01\u0e31\u0e1a 1 \u0e40\u0e14\u0e37\u0e2d\u0e19</li>'+
'</ul>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:10px 0">'+
'<strong>\u0e15\u0e31\u0e27\u0e2d\u0e22\u0e48\u0e32\u0e07:</strong> \u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19 \u0e3f62,566<br>'+
'\u0e04\u0e48\u0e32\u0e1a\u0e2d\u0e01\u0e01\u0e25\u0e48\u0e32\u0e27\u0e41\u0e17\u0e19 = <strong>\u0e3f62,566</strong></div>'
},
{id:'help-leave-cashout',category:'labour-law',badge:'law',
title:'\u0e04\u0e48\u0e32\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14\u0e1e\u0e31\u0e01\u0e23\u0e49\u0e2d\u0e19\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e2a\u0e34\u0e49\u0e19\u0e2a\u0e38\u0e14\u0e01\u0e32\u0e23\u0e08\u0e49\u0e32\u0e07\u0e07\u0e32\u0e19',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u0e01\u0e0e\u0e2b\u0e21\u0e32\u0e22 \u2014 \u0e1e.\u0e23.\u0e1a.\u0e04\u0e38\u0e49\u0e21\u0e04\u0e23\u0e2d\u0e07\u0e41\u0e23\u0e07\u0e07\u0e32\u0e19 \u0e21\u0e32\u0e15\u0e23\u0e32 67</div>'+
'<div class="help-badge help-badge-company" style="margin-top:4px">\ud83c\udfe2 \u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17 \u2014 \u0e19\u0e42\u0e22\u0e1a\u0e32\u0e22\u0e25\u0e32 DXC Technology</div>'+
'<p style="margin-top:8px">\u0e15\u0e32\u0e21\u0e01\u0e0e\u0e2b\u0e21\u0e32\u0e22\u0e44\u0e17\u0e22 \u0e40\u0e21\u0e37\u0e48\u0e2d\u0e2a\u0e34\u0e49\u0e19\u0e2a\u0e38\u0e14\u0e01\u0e32\u0e23\u0e08\u0e49\u0e32\u0e07\u0e07\u0e32\u0e19 <strong>\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14\u0e1e\u0e31\u0e01\u0e23\u0e49\u0e2d\u0e19\u0e17\u0e35\u0e48\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49\u0e43\u0e0a\u0e49</strong>\u0e15\u0e49\u0e2d\u0e07\u0e08\u0e48\u0e32\u0e22\u0e40\u0e1b\u0e47\u0e19\u0e40\u0e07\u0e34\u0e19</p>'+
'<h4 style="font-size:11px;font-weight:600;margin:10px 0 4px">\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e25\u0e32 DXC</h4>'+
'<table class="tbl" style="margin:6px 0"><thead><tr><th>\u0e2d\u0e32\u0e22\u0e38\u0e07\u0e32\u0e19</th><th class="r">\u0e27\u0e31\u0e19\u0e25\u0e32/\u0e1b\u0e35</th></tr></thead><tbody>'+
'<tr><td>\u0e19\u0e49\u0e2d\u0e22\u0e01\u0e27\u0e48\u0e32 5 \u0e1b\u0e35</td><td class="r" style="font-family:var(--mono)">15 \u0e27\u0e31\u0e19</td></tr>'+
'<tr><td>5 \u2013 &lt; 10 \u0e1b\u0e35</td><td class="r" style="font-family:var(--mono)">17 \u0e27\u0e31\u0e19</td></tr>'+
'<tr><td>10 \u0e1b\u0e35\u0e02\u0e36\u0e49\u0e19\u0e44\u0e1b</td><td class="r" style="font-family:var(--mono)">20 \u0e27\u0e31\u0e19</td></tr>'+
'</tbody></table>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:10px 0">'+
'\u0e04\u0e48\u0e32\u0e27\u0e31\u0e19\u0e2b\u0e22\u0e38\u0e14 = \u0e08\u0e33\u0e19\u0e27\u0e19\u0e27\u0e31\u0e19 \u00d7 (\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19 \u00f7 30)<br><br>'+
'<strong>DXC:</strong> CY \u0e15\u0e32\u0e21\u0e2a\u0e31\u0e14\u0e2a\u0e48\u0e27\u0e19 + LY \u0e22\u0e01\u0e22\u0e2d\u0e14 \u2212 \u0e27\u0e31\u0e19\u0e25\u0e32\u0e17\u0e35\u0e48\u0e43\u0e0a\u0e49\u0e41\u0e25\u0e49\u0e27</div>'
},
{id:'help-tax-rates',category:'tax',badge:'law',
title:'\u0e2d\u0e31\u0e15\u0e23\u0e32\u0e20\u0e32\u0e29\u0e35\u0e40\u0e07\u0e34\u0e19\u0e44\u0e14\u0e49\u0e01\u0e49\u0e32\u0e27\u0e2b\u0e19\u0e49\u0e32',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u0e01\u0e0e\u0e2b\u0e21\u0e32\u0e22 \u2014 \u0e1b\u0e23\u0e30\u0e21\u0e27\u0e25\u0e23\u0e31\u0e29\u0e0e\u0e32\u0e01\u0e23 \u0e21\u0e32\u0e15\u0e23\u0e32 48 \u0e41\u0e25\u0e30 50</div>'+
'<table class="tbl" style="margin:10px 0"><thead><tr><th>\u0e40\u0e07\u0e34\u0e19\u0e44\u0e14\u0e49\u0e2a\u0e38\u0e17\u0e18\u0e34 (\u0e1a\u0e32\u0e17)</th><th class="r">\u0e2d\u0e31\u0e15\u0e23\u0e32</th><th class="r">\u0e20\u0e32\u0e29\u0e35\u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14/\u0e02\u0e31\u0e49\u0e19</th><th class="r">\u0e20\u0e32\u0e29\u0e35\u0e2a\u0e30\u0e2a\u0e21</th></tr></thead><tbody>'+
'<tr><td>0 \u2013 150,000</td><td class="r">\u0e22\u0e01\u0e40\u0e27\u0e49\u0e19</td><td class="r" style="font-family:var(--mono)">0</td><td class="r" style="font-family:var(--mono)">0</td></tr>'+
'<tr><td>150,001 \u2013 300,000</td><td class="r">5%</td><td class="r" style="font-family:var(--mono)">7,500</td><td class="r" style="font-family:var(--mono)">7,500</td></tr>'+
'<tr><td>300,001 \u2013 500,000</td><td class="r">10%</td><td class="r" style="font-family:var(--mono)">20,000</td><td class="r" style="font-family:var(--mono)">27,500</td></tr>'+
'<tr><td>500,001 \u2013 750,000</td><td class="r">15%</td><td class="r" style="font-family:var(--mono)">37,500</td><td class="r" style="font-family:var(--mono)">65,000</td></tr>'+
'<tr><td>750,001 \u2013 1,000,000</td><td class="r">20%</td><td class="r" style="font-family:var(--mono)">50,000</td><td class="r" style="font-family:var(--mono)">115,000</td></tr>'+
'<tr><td>1,000,001 \u2013 2,000,000</td><td class="r">25%</td><td class="r" style="font-family:var(--mono)">250,000</td><td class="r" style="font-family:var(--mono)">365,000</td></tr>'+
'<tr><td>2,000,001 \u2013 5,000,000</td><td class="r">30%</td><td class="r" style="font-family:var(--mono)">900,000</td><td class="r" style="font-family:var(--mono)">1,265,000</td></tr>'+
'<tr><td>5,000,001+</td><td class="r">35%</td><td class="r" style="font-family:var(--mono)">\u2014</td><td class="r" style="font-family:var(--mono)">\u2014</td></tr>'+
'</tbody></table>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:10px 0">'+
'<strong>\u0e40\u0e07\u0e34\u0e19\u0e44\u0e14\u0e49\u0e2a\u0e38\u0e17\u0e18\u0e34</strong> = \u0e40\u0e07\u0e34\u0e19\u0e44\u0e14\u0e49\u0e1e\u0e36\u0e07\u0e1b\u0e23\u0e30\u0e40\u0e21\u0e34\u0e19 \u2212 \u0e04\u0e48\u0e32\u0e43\u0e0a\u0e49\u0e08\u0e48\u0e32\u0e22 (50% \u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14 \u0e3f100,000) \u2212 \u0e04\u0e48\u0e32\u0e25\u0e14\u0e2b\u0e22\u0e48\u0e2d\u0e19\u0e15\u0e48\u0e32\u0e07\u0e46<br>'+
'<strong>\u0e20\u0e32\u0e29\u0e35</strong> = \u0e04\u0e33\u0e19\u0e27\u0e13\u0e15\u0e32\u0e21\u0e2d\u0e31\u0e15\u0e23\u0e32\u0e01\u0e49\u0e32\u0e27\u0e2b\u0e19\u0e49\u0e32</div>'
},
{id:'help-tax-separation',category:'tax',badge:'law',
title:'\u0e20\u0e32\u0e29\u0e35\u0e40\u0e07\u0e34\u0e19\u0e44\u0e14\u0e49\u0e01\u0e23\u0e13\u0e35\u0e2a\u0e34\u0e49\u0e19\u0e2a\u0e38\u0e14\u0e01\u0e32\u0e23\u0e08\u0e49\u0e32\u0e07\u0e07\u0e32\u0e19 \u2014 \u0e21\u0e32\u0e15\u0e23\u0e32 48(5)',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u0e01\u0e0e\u0e2b\u0e21\u0e32\u0e22 \u2014 \u0e1b\u0e23\u0e30\u0e21\u0e27\u0e25\u0e23\u0e31\u0e29\u0e0e\u0e32\u0e01\u0e23 \u0e21\u0e32\u0e15\u0e23\u0e32 48(5) \u0e41\u0e25\u0e30\u0e01\u0e0e\u0e01\u0e23\u0e30\u0e17\u0e23\u0e27\u0e07 \u0e09\u0e1a\u0e31\u0e1a\u0e17\u0e35\u0e48 126</div>'+
'<p>\u0e40\u0e07\u0e34\u0e19\u0e44\u0e14\u0e49\u0e01\u0e23\u0e13\u0e35\u0e2a\u0e34\u0e49\u0e19\u0e2a\u0e38\u0e14\u0e01\u0e32\u0e23\u0e08\u0e49\u0e32\u0e07\u0e07\u0e32\u0e19\u0e44\u0e14\u0e49\u0e23\u0e31\u0e1a\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e1b\u0e23\u0e30\u0e42\u0e22\u0e0a\u0e19\u0e4c\u0e17\u0e32\u0e07\u0e20\u0e32\u0e29\u0e35<strong>\u0e14\u0e35\u0e01\u0e27\u0e48\u0e32\u0e23\u0e32\u0e22\u0e44\u0e14\u0e49\u0e1b\u0e01\u0e15\u0e34</strong></p>'+
'<h4 style="font-size:11px;font-weight:600;margin:10px 0 4px">\u0e2a\u0e48\u0e27\u0e19\u0e22\u0e01\u0e40\u0e27\u0e49\u0e19\u0e20\u0e32\u0e29\u0e35</h4>'+
'<p>\u0e04\u0e48\u0e32\u0e0a\u0e14\u0e40\u0e0a\u0e22\u0e22\u0e01\u0e40\u0e27\u0e49\u0e19\u0e44\u0e21\u0e48\u0e40\u0e01\u0e34\u0e19\u0e08\u0e33\u0e19\u0e27\u0e19\u0e17\u0e35\u0e48<strong>\u0e21\u0e32\u0e01\u0e01\u0e27\u0e48\u0e32</strong>\u0e23\u0e30\u0e2b\u0e27\u0e48\u0e32\u0e07:</p>'+
'<ul style="padding-left:18px;margin:6px 0">'+
'<li>\u0e04\u0e48\u0e32\u0e08\u0e49\u0e32\u0e07 300 \u0e27\u0e31\u0e19 \u0e2b\u0e23\u0e37\u0e2d</li>'+
'<li>\u0e3f300,000</li>'+
'</ul>'+
'<h4 style="font-size:11px;font-weight:600;margin:10px 0 4px">\u0e2a\u0e48\u0e27\u0e19\u0e17\u0e35\u0e48\u0e40\u0e2a\u0e35\u0e22\u0e20\u0e32\u0e29\u0e35 \u2014 \u0e27\u0e34\u0e18\u0e35\u0e04\u0e33\u0e19\u0e27\u0e13\u0e04\u0e23\u0e36\u0e48\u0e07\u0e2d\u0e31\u0e15\u0e23\u0e32</h4>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:6px 0">'+
'<strong>\u0e02\u0e31\u0e49\u0e19 1:</strong> \u0e40\u0e07\u0e34\u0e19\u0e44\u0e14\u0e49\u0e17\u0e35\u0e48\u0e40\u0e2a\u0e35\u0e22\u0e20\u0e32\u0e29\u0e35 = \u0e22\u0e2d\u0e14\u0e23\u0e27\u0e21 \u2212 \u0e2a\u0e48\u0e27\u0e19\u0e22\u0e01\u0e40\u0e27\u0e49\u0e19<br>'+
'<strong>\u0e02\u0e31\u0e49\u0e19 2:</strong> \u0e2b\u0e31\u0e01\u0e04\u0e48\u0e32\u0e43\u0e0a\u0e49\u0e08\u0e48\u0e32\u0e22 = \u0e3f7,000 \u00d7 \u0e2d\u0e32\u0e22\u0e38\u0e07\u0e32\u0e19\u0e1b\u0e35<br>'+
'<strong>\u0e02\u0e31\u0e49\u0e19 3:</strong> \u0e2a\u0e38\u0e17\u0e18\u0e34 = \u0e02\u0e31\u0e49\u0e19 1 \u2212 \u0e02\u0e31\u0e49\u0e19 2<br>'+
'<strong>\u0e02\u0e31\u0e49\u0e19 4:</strong> \u0e2b\u0e32\u0e23\u0e14\u0e49\u0e27\u0e22\u0e08\u0e33\u0e19\u0e27\u0e19\u0e1b\u0e35<br>'+
'<strong>\u0e02\u0e31\u0e49\u0e19 5:</strong> \u0e04\u0e33\u0e19\u0e27\u0e13\u0e20\u0e32\u0e29\u0e35\u0e15\u0e32\u0e21\u0e2d\u0e31\u0e15\u0e23\u0e32\u0e01\u0e49\u0e32\u0e27\u0e2b\u0e19\u0e49\u0e32<br>'+
'<strong>\u0e02\u0e31\u0e49\u0e19 6:</strong> \u0e20\u0e32\u0e29\u0e35\u0e15\u0e48\u0e2d\u0e1b\u0e35 \u00d7 \u0e08\u0e33\u0e19\u0e27\u0e19\u0e1b\u0e35 \u00f7 2 = <strong>\u0e20\u0e32\u0e29\u0e35\u0e2a\u0e38\u0e14\u0e17\u0e49\u0e32\u0e22</strong></div>'
},
{id:'help-tax-exemptions',category:'tax',badge:'law',
title:'\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e25\u0e14\u0e2b\u0e22\u0e48\u0e2d\u0e19\u0e41\u0e25\u0e30\u0e22\u0e01\u0e40\u0e27\u0e49\u0e19\u0e20\u0e32\u0e29\u0e35\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u0e01\u0e0e\u0e2b\u0e21\u0e32\u0e22 \u2014 \u0e1b\u0e23\u0e30\u0e21\u0e27\u0e25\u0e23\u0e31\u0e29\u0e0e\u0e32\u0e01\u0e23 & \u0e23\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e1a\u0e1b\u0e35 2569</div>'+
'<p>\u0e14\u0e39\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14\u0e43\u0e19\u0e2b\u0e31\u0e27\u0e02\u0e49\u0e2d\u0e20\u0e32\u0e29\u0e32\u0e2d\u0e31\u0e07\u0e01\u0e24\u0e29\u0e14\u0e49\u0e32\u0e19\u0e1a\u0e19 (\u0e40\u0e19\u0e37\u0e49\u0e2d\u0e2b\u0e32\u0e40\u0e2b\u0e21\u0e37\u0e2d\u0e19\u0e01\u0e31\u0e19)</p>'
},
{id:'help-sso-contributions',category:'social-security',badge:'law',
title:'\u0e2b\u0e25\u0e31\u0e01\u0e40\u0e01\u0e13\u0e11\u0e4c\u0e01\u0e32\u0e23\u0e2a\u0e21\u0e17\u0e1a\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u0e01\u0e0e\u0e2b\u0e21\u0e32\u0e22 \u2014 \u0e1e.\u0e23.\u0e1a.\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21 \u0e1e.\u0e28. 2533 \u0e21\u0e32\u0e15\u0e23\u0e32 33</div>'+
'<p><strong>\u0e2b\u0e25\u0e31\u0e01\u0e01\u0e0e\u0e2b\u0e21\u0e32\u0e22:</strong> \u0e1e.\u0e23.\u0e1a.\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21 \u0e1e.\u0e28. 2533 \u0e21\u0e32\u0e15\u0e23\u0e32 33<br>'+
'<strong>\u0e2b\u0e19\u0e48\u0e27\u0e22\u0e07\u0e32\u0e19:</strong> \u0e2a\u0e33\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21 (\u0e2a\u0e1b\u0e2a.) \u0e01\u0e23\u0e30\u0e17\u0e23\u0e27\u0e07\u0e41\u0e23\u0e07\u0e07\u0e32\u0e19<br>'+
'<strong>\u0e1c\u0e39\u0e49\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e15\u0e19:</strong> \u0e25\u0e39\u0e01\u0e08\u0e49\u0e32\u0e07\u0e20\u0e32\u0e04\u0e40\u0e2d\u0e01\u0e0a\u0e19\u0e17\u0e38\u0e01\u0e04\u0e19 \u0e2d\u0e32\u0e22\u0e38 15\u201360 \u0e1b\u0e35</p>'+
'<table class="tbl" style="margin:8px 0"><thead><tr><th>\u0e1d\u0e48\u0e32\u0e22</th><th class="r">\u0e2d\u0e31\u0e15\u0e23\u0e32</th><th>\u0e2b\u0e21\u0e32\u0e22\u0e40\u0e2b\u0e15\u0e38</th></tr></thead><tbody>'+
'<tr><td>\u0e25\u0e39\u0e01\u0e08\u0e49\u0e32\u0e07</td><td class="r" style="font-family:var(--mono)">5%</td><td>\u0e2b\u0e31\u0e01\u0e08\u0e32\u0e01\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e17\u0e38\u0e01\u0e40\u0e14\u0e37\u0e2d\u0e19</td></tr>'+
'<tr><td>\u0e19\u0e32\u0e22\u0e08\u0e49\u0e32\u0e07</td><td class="r" style="font-family:var(--mono)">5%</td><td>\u0e2a\u0e21\u0e17\u0e1a\u0e2a\u0e21\u0e17\u0e1a \u0e08\u0e48\u0e32\u0e22\u0e41\u0e22\u0e01\u0e15\u0e48\u0e32\u0e07\u0e2b\u0e32\u0e01</td></tr>'+
'<tr><td>\u0e23\u0e31\u0e10\u0e1a\u0e32\u0e25</td><td class="r" style="font-family:var(--mono)">2.75%</td><td>\u0e23\u0e31\u0e10\u0e1a\u0e32\u0e25\u0e08\u0e48\u0e32\u0e22</td></tr>'+
'</tbody></table>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:10px 0">'+
'<strong>\u0e10\u0e32\u0e19\u0e2a\u0e21\u0e17\u0e1a</strong> = min(\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19, \u0e40\u0e1e\u0e14\u0e32\u0e19\u0e04\u0e48\u0e32\u0e08\u0e49\u0e32\u0e07)<br>'+
'<strong>\u0e40\u0e07\u0e34\u0e19\u0e2a\u0e21\u0e17\u0e1a</strong> = \u0e10\u0e32\u0e19\u0e2a\u0e21\u0e17\u0e1a \u00d7 5%<br>'+
'\u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14 \u0e3f875/\u0e40\u0e14\u0e37\u0e2d\u0e19 (2569+)</div>'
},
{id:'help-sso-ceiling',category:'social-security',badge:'law',
title:'\u0e40\u0e1e\u0e14\u0e32\u0e19\u0e04\u0e48\u0e32\u0e08\u0e49\u0e32\u0e07 (\u0e1b\u0e23\u0e31\u0e1a\u0e2b\u0e25\u0e32\u0e22\u0e23\u0e30\u0e22\u0e30)',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u0e01\u0e0e\u0e2b\u0e21\u0e32\u0e22 \u2014 \u0e01\u0e0e\u0e01\u0e23\u0e30\u0e17\u0e23\u0e27\u0e07 \u0e1b\u0e23\u0e30\u0e01\u0e32\u0e28\u0e23\u0e32\u0e0a\u0e01\u0e34\u0e08\u0e08\u0e32\u0e19\u0e38\u0e40\u0e1a\u0e01\u0e29\u0e32 12 \u0e18.\u0e04. 2568</div>'+
'<p>\u0e14\u0e39\u0e15\u0e32\u0e23\u0e32\u0e07\u0e40\u0e1e\u0e14\u0e32\u0e19\u0e43\u0e19\u0e2b\u0e31\u0e27\u0e02\u0e49\u0e2d\u0e20\u0e32\u0e29\u0e32\u0e2d\u0e31\u0e07\u0e01\u0e24\u0e29\u0e14\u0e49\u0e32\u0e19\u0e1a\u0e19 (\u0e40\u0e19\u0e37\u0e49\u0e2d\u0e2b\u0e32\u0e40\u0e2b\u0e21\u0e37\u0e2d\u0e19\u0e01\u0e31\u0e19)</p>'
},
{id:'help-sso-unemployment',category:'social-security',badge:'law',
title:'\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e1b\u0e23\u0e30\u0e42\u0e22\u0e0a\u0e19\u0e4c\u0e01\u0e23\u0e13\u0e35\u0e27\u0e48\u0e32\u0e07\u0e07\u0e32\u0e19',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u0e01\u0e0e\u0e2b\u0e21\u0e32\u0e22 \u2014 \u0e1e.\u0e23.\u0e1a.\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21 \u0e2b\u0e21\u0e27\u0e14 7 (\u0e27\u0e48\u0e32\u0e07\u0e07\u0e32\u0e19)</div>'+
'<table class="tbl" style="margin:10px 0"><thead><tr><th>\u0e40\u0e2b\u0e15\u0e38</th><th class="r">\u0e2d\u0e31\u0e15\u0e23\u0e32</th><th class="r">\u0e23\u0e30\u0e22\u0e30\u0e40\u0e27\u0e25\u0e32\u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14</th></tr></thead><tbody>'+
'<tr style="background:var(--success-bg)"><td><strong>\u0e16\u0e39\u0e01\u0e40\u0e25\u0e34\u0e01\u0e08\u0e49\u0e32\u0e07</strong></td><td class="r" style="font-family:var(--mono)">50%</td><td class="r" style="font-family:var(--mono)">180 \u0e27\u0e31\u0e19 (6 \u0e40\u0e14\u0e37\u0e2d\u0e19)</td></tr>'+
'<tr><td>\u0e25\u0e32\u0e2d\u0e2d\u0e01/\u0e2a\u0e34\u0e49\u0e19\u0e2a\u0e38\u0e14\u0e2a\u0e31\u0e0d\u0e0d\u0e32</td><td class="r" style="font-family:var(--mono)">30%</td><td class="r" style="font-family:var(--mono)">90 \u0e27\u0e31\u0e19 (3 \u0e40\u0e14\u0e37\u0e2d\u0e19)</td></tr>'+
'</tbody></table>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:6px 0">'+
'\u0e40\u0e1e\u0e14\u0e32\u0e19\u0e04\u0e48\u0e32\u0e08\u0e49\u0e32\u0e07: \u0e3f17,500 (2569+)<br>'+
'\u0e16\u0e39\u0e01\u0e40\u0e25\u0e34\u0e01\u0e08\u0e49\u0e32\u0e07: 17,500 \u00d7 50% = <strong>\u0e3f8,750/\u0e40\u0e14\u0e37\u0e2d\u0e19</strong> \u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14 6 \u0e40\u0e14\u0e37\u0e2d\u0e19<br>'+
'\u0e25\u0e32\u0e2d\u0e2d\u0e01: 17,500 \u00d7 30% = <strong>\u0e3f5,250/\u0e40\u0e14\u0e37\u0e2d\u0e19</strong> \u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14 3 \u0e40\u0e14\u0e37\u0e2d\u0e19</div>'+
'<p><strong>\u0e27\u0e34\u0e18\u0e35\u0e22\u0e37\u0e48\u0e19:</strong> \u0e02\u0e36\u0e49\u0e19\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19\u0e17\u0e35\u0e48\u0e01\u0e23\u0e21\u0e01\u0e32\u0e23\u0e08\u0e31\u0e14\u0e2b\u0e32\u0e07\u0e32\u0e19\u0e20\u0e32\u0e22\u0e43\u0e19 <strong>30 \u0e27\u0e31\u0e19</strong>\u0e2b\u0e25\u0e31\u0e07\u0e2a\u0e34\u0e49\u0e19\u0e2a\u0e38\u0e14\u0e01\u0e32\u0e23\u0e08\u0e49\u0e32\u0e07\u0e07\u0e32\u0e19</p>'
},
{id:'help-sso-pension',category:'social-security',badge:'law',
title:'\u0e40\u0e07\u0e34\u0e19\u0e1a\u0e33\u0e19\u0e32\u0e0d\u0e0a\u0e23\u0e32\u0e20\u0e32\u0e1e',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u0e01\u0e0e\u0e2b\u0e21\u0e32\u0e22 \u2014 \u0e1e.\u0e23.\u0e1a.\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21 \u0e2b\u0e21\u0e27\u0e14 5 (\u0e0a\u0e23\u0e32\u0e20\u0e32\u0e1e)</div>'+
'<p>\u0e2d\u0e32\u0e22\u0e38 <strong>55 \u0e1b\u0e35\u0e02\u0e36\u0e49\u0e19\u0e44\u0e1b</strong> \u0e41\u0e25\u0e30\u0e2a\u0e48\u0e07\u0e40\u0e07\u0e34\u0e19\u0e2a\u0e21\u0e17\u0e1a\u0e04\u0e23\u0e1a <strong>180 \u0e40\u0e14\u0e37\u0e2d\u0e19</strong> (15 \u0e1b\u0e35)</p>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:10px 0">'+
'\u0e1a\u0e33\u0e19\u0e32\u0e0d\u0e40\u0e14\u0e37\u0e2d\u0e19 = 20% \u0e02\u0e2d\u0e07\u0e04\u0e48\u0e32\u0e08\u0e49\u0e32\u0e07\u0e40\u0e09\u0e25\u0e35\u0e48\u0e22<br>'+
'+ 1.5% \u0e15\u0e48\u0e2d\u0e17\u0e38\u0e01 12 \u0e40\u0e14\u0e37\u0e2d\u0e19\u0e17\u0e35\u0e48\u0e40\u0e01\u0e34\u0e19 180 \u0e40\u0e14\u0e37\u0e2d\u0e19<br><br>'+
'<strong>\u0e19\u0e49\u0e2d\u0e22\u0e01\u0e27\u0e48\u0e32 180 \u0e40\u0e14\u0e37\u0e2d\u0e19:</strong> \u0e44\u0e14\u0e49\u0e23\u0e31\u0e1a\u0e40\u0e07\u0e34\u0e19\u0e01\u0e49\u0e2d\u0e19\u0e04\u0e37\u0e19\u0e40\u0e1b\u0e47\u0e19\u0e01\u0e49\u0e2d\u0e19 (\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49\u0e1a\u0e33\u0e19\u0e32\u0e0d\u0e23\u0e32\u0e22\u0e40\u0e14\u0e37\u0e2d\u0e19)</div>'
},
{id:'help-sso-benefits',category:'social-security',badge:'law',
title:'\u0e2a\u0e23\u0e38\u0e1b\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e1b\u0e23\u0e30\u0e42\u0e22\u0e0a\u0e19\u0e4c (\u0e2d\u0e31\u0e15\u0e23\u0e32\u0e1b\u0e35 2569)',
content:'<p>\u0e14\u0e39\u0e15\u0e32\u0e23\u0e32\u0e07\u0e43\u0e19\u0e2b\u0e31\u0e27\u0e02\u0e49\u0e2d\u0e20\u0e32\u0e29\u0e32\u0e2d\u0e31\u0e07\u0e01\u0e24\u0e29 (\u0e40\u0e19\u0e37\u0e49\u0e2d\u0e2b\u0e32\u0e40\u0e2b\u0e21\u0e37\u0e2d\u0e19\u0e01\u0e31\u0e19)</p>'
},
{id:'help-sso-compliance',category:'social-security',badge:'law',
title:'\u0e02\u0e49\u0e2d\u0e1b\u0e0f\u0e34\u0e1a\u0e31\u0e15\u0e34\u0e2a\u0e33\u0e04\u0e31\u0e0d',
content:'<ul style="padding-left:18px;margin:8px 0;font-size:11px;line-height:1.7">'+
'<li>\u0e19\u0e33\u0e2a\u0e48\u0e07\u0e20\u0e32\u0e22\u0e43\u0e19<strong>\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48 15 \u0e02\u0e2d\u0e07\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e16\u0e31\u0e14\u0e44\u0e1b</strong></li>'+
'<li>\u0e04\u0e48\u0e32\u0e1b\u0e23\u0e31\u0e1a\u0e25\u0e48\u0e32\u0e0a\u0e49\u0e32: <strong>2% \u0e15\u0e48\u0e2d\u0e40\u0e14\u0e37\u0e2d\u0e19</strong></li>'+
'<li>\u0e02\u0e36\u0e49\u0e19\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19\u0e20\u0e32\u0e22\u0e43\u0e19 <strong>30 \u0e27\u0e31\u0e19</strong></li>'+
'<li>\u0e04\u0e38\u0e49\u0e21\u0e04\u0e23\u0e2d\u0e07\u0e40\u0e23\u0e34\u0e48\u0e21<strong>\u0e15\u0e31\u0e49\u0e07\u0e41\u0e15\u0e48\u0e27\u0e31\u0e19\u0e41\u0e23\u0e01\u0e17\u0e35\u0e48\u0e17\u0e33\u0e07\u0e32\u0e19</strong></li>'+
'</ul>'
},
{id:'help-sso-setup',category:'social-security',badge:'info',
title:'\u0e27\u0e34\u0e18\u0e35\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21\u0e43\u0e19\u0e41\u0e2d\u0e1b',
content:'<ol style="padding-left:18px"><li>\u0e44\u0e1b\u0e17\u0e35\u0e48\u0e41\u0e17\u0e47\u0e1a <strong>Payroll</strong></li><li>\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e23\u0e32\u0e22\u0e44\u0e14\u0e49: \u0e15\u0e34\u0e01\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e2b\u0e21\u0e32\u0e22 <strong>SSO</strong></li><li>\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e2b\u0e31\u0e01: \u0e40\u0e25\u0e37\u0e2d\u0e01 <strong>"% of SSO Base"</strong>, \u0e2d\u0e31\u0e15\u0e23\u0e32 = <strong>5%</strong>, \u0e40\u0e1e\u0e14\u0e32\u0e19 = <strong>\u0e3f875</strong></li></ol>'
},
{id:'help-pvd-overview',category:'provident-fund',badge:'regulation',
title:'\u0e01\u0e2d\u0e07\u0e17\u0e38\u0e19\u0e2a\u0e33\u0e23\u0e2d\u0e07\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07\u0e0a\u0e35\u0e1e\u0e04\u0e37\u0e2d\u0e2d\u0e30\u0e44\u0e23',
content:'<div class="help-badge help-badge-regulation">\ud83d\udcdc \u0e23\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e1a \u2014 \u0e01.\u0e25.\u0e15. / \u0e1e.\u0e23.\u0e1a.\u0e01\u0e2d\u0e07\u0e17\u0e38\u0e19\u0e2a\u0e33\u0e23\u0e2d\u0e07\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07\u0e0a\u0e35\u0e1e \u0e1e.\u0e28. 2530</div>'+
'<p>\u0e01\u0e2d\u0e07\u0e17\u0e38\u0e19\u0e2a\u0e33\u0e23\u0e2d\u0e07\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07\u0e0a\u0e35\u0e1e (PVD) \u0e40\u0e1b\u0e47\u0e19\u0e41\u0e1c\u0e19\u0e2d\u0e2d\u0e21\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e40\u0e01\u0e29\u0e35\u0e22\u0e13\u0e2d\u0e32\u0e22\u0e38\u0e42\u0e14\u0e22\u0e19\u0e32\u0e22\u0e08\u0e49\u0e32\u0e07\u0e2a\u0e19\u0e31\u0e1a\u0e2a\u0e19\u0e38\u0e19</p>'+
'<ul style="padding-left:18px;margin:8px 0">'+
'<li><strong>\u0e2a\u0e48\u0e27\u0e19\u0e25\u0e39\u0e01\u0e08\u0e49\u0e32\u0e07:</strong> \u0e40\u0e1b\u0e47\u0e19\u0e02\u0e2d\u0e07\u0e04\u0e38\u0e13 100% \u0e40\u0e2a\u0e21\u0e2d</li>'+
'<li><strong>\u0e2a\u0e48\u0e27\u0e19\u0e19\u0e32\u0e22\u0e08\u0e49\u0e32\u0e07:</strong> Vest \u0e15\u0e32\u0e21\u0e2d\u0e32\u0e22\u0e38\u0e07\u0e32\u0e19</li>'+
'<li>DXC: \u0e1e\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19 3% + \u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17 3%</li>'+
'</ul>'
},
{id:'help-pvd-vesting',category:'provident-fund',badge:'company',
title:'\u0e15\u0e32\u0e23\u0e32\u0e07 Vesting DXC',
content:'<div class="help-badge help-badge-company">\ud83c\udfe2 \u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17 \u2014 DXC Technology</div>'+
'<table class="tbl" style="margin:10px 0"><thead><tr><th>\u0e2d\u0e32\u0e22\u0e38\u0e07\u0e32\u0e19</th><th class="r">Vesting %</th></tr></thead><tbody>'+
'<tr><td>\u0e19\u0e49\u0e2d\u0e22\u0e01\u0e27\u0e48\u0e32 3 \u0e1b\u0e35</td><td class="r" style="font-family:var(--mono);color:var(--danger)">0%</td></tr>'+
'<tr><td>3 \u0e1b\u0e35</td><td class="r" style="font-family:var(--mono)">20%</td></tr>'+
'<tr><td>4 \u0e1b\u0e35</td><td class="r" style="font-family:var(--mono)">40%</td></tr>'+
'<tr><td>5 \u0e1b\u0e35</td><td class="r" style="font-family:var(--mono)">60%</td></tr>'+
'<tr><td>6 \u0e1b\u0e35</td><td class="r" style="font-family:var(--mono)">80%</td></tr>'+
'<tr style="background:var(--success-bg)"><td><strong>7+ \u0e1b\u0e35</strong></td><td class="r" style="font-family:var(--mono)"><strong>100%</strong></td></tr>'+
'</tbody></table>'
},
{id:'help-pvd-withdrawal',category:'provident-fund',badge:'law',
title:'\u0e15\u0e31\u0e27\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e01\u0e32\u0e23\u0e16\u0e2d\u0e19\u0e41\u0e25\u0e30\u0e20\u0e32\u0e29\u0e35',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u0e01\u0e0e\u0e2b\u0e21\u0e32\u0e22 \u2014 \u0e1b\u0e23\u0e30\u0e21\u0e27\u0e25\u0e23\u0e31\u0e29\u0e0e\u0e32\u0e01\u0e23 & \u0e1e.\u0e23.\u0e1a.\u0e01\u0e2d\u0e07\u0e17\u0e38\u0e19\u0e2a\u0e33\u0e23\u0e2d\u0e07\u0e40\u0e25\u0e35\u0e49\u0e22\u0e07\u0e0a\u0e35\u0e1e</div>'+
'<p>\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e25\u0e32\u0e2d\u0e2d\u0e01\u0e21\u0e35 3 \u0e15\u0e31\u0e27\u0e40\u0e25\u0e37\u0e2d\u0e01:</p>'+
'<ul style="padding-left:18px;margin:8px 0">'+
'<li><strong>\ud83d\udcb5 \u0e16\u0e2d\u0e19\u0e40\u0e07\u0e34\u0e19\u0e2a\u0e14:</strong> \u0e40\u0e2a\u0e35\u0e22\u0e20\u0e32\u0e29\u0e35\u0e16\u0e49\u0e32\u0e2d\u0e32\u0e22\u0e38\u0e07\u0e32\u0e19 &lt;5 \u0e1b\u0e35 \u0e2b\u0e23\u0e37\u0e2d\u0e2d\u0e32\u0e22\u0e38 &lt;55</li>'+
'<li><strong>\ud83d\udd04 \u0e42\u0e2d\u0e19\u0e44\u0e1b RMF:</strong> \u0e44\u0e21\u0e48\u0e40\u0e2a\u0e35\u0e22\u0e20\u0e32\u0e29\u0e35 \u0e15\u0e49\u0e2d\u0e07\u0e16\u0e37\u0e2d\u0e16\u0e36\u0e07\u0e2d\u0e32\u0e22\u0e38 55</li>'+
'<li><strong>\ud83c\udfe6 \u0e04\u0e07\u0e44\u0e27\u0e49/\u0e42\u0e2d\u0e19:</strong> \u0e22\u0e49\u0e32\u0e22\u0e44\u0e1b\u0e19\u0e32\u0e22\u0e08\u0e49\u0e32\u0e07\u0e43\u0e2b\u0e21\u0e48 \u0e44\u0e21\u0e48\u0e40\u0e2a\u0e35\u0e22\u0e20\u0e32\u0e29\u0e35</li>'+
'</ul>'
},
{id:'help-dxc-aip',category:'company-benefits',badge:'company',
title:'\u0e42\u0e1a\u0e19\u0e31\u0e2a AIP (Annual Incentive Plan)',
content:'<div class="help-badge help-badge-company">\ud83c\udfe2 \u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17 \u2014 DXC Technology</div>'+
'<p>\u0e42\u0e1a\u0e19\u0e31\u0e2a\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e1b\u0e35\u0e15\u0e32\u0e21\u0e1c\u0e25\u0e07\u0e32\u0e19 \u0e40\u0e1b\u0e49\u0e32\u0e2b\u0e21\u0e32\u0e22 5\u201320% \u0e02\u0e2d\u0e07\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e1b\u0e35 \u0e08\u0e48\u0e32\u0e22\u0e1b\u0e23\u0e30\u0e21\u0e32\u0e13\u0e21\u0e35\u0e19\u0e32\u0e04\u0e21</p>'
},
{id:'help-dxc-13th',category:'company-benefits',badge:'company',
title:'\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e17\u0e35\u0e48 13',
content:'<div class="help-badge help-badge-company">\ud83c\udfe2 \u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17 \u2014 DXC Technology</div>'+
'<p>DXC \u0e08\u0e48\u0e32\u0e22\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e17\u0e35\u0e48 13 \u0e43\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e18\u0e31\u0e19\u0e27\u0e32\u0e04\u0e21 \u0e40\u0e17\u0e48\u0e32\u0e01\u0e31\u0e1a 1 \u0e40\u0e14\u0e37\u0e2d\u0e19\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e1e\u0e37\u0e49\u0e19\u0e10\u0e32\u0e19 \u0e1e\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19\u0e43\u0e2b\u0e21\u0e48\u0e44\u0e14\u0e49\u0e15\u0e32\u0e21\u0e2a\u0e31\u0e14\u0e2a\u0e48\u0e27\u0e19</p>'
},
{id:'help-dxc-leave',category:'company-benefits',badge:'company',
title:'\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e25\u0e32 DXC',
content:'<div class="help-badge help-badge-company">\ud83c\udfe2 \u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17 \u2014 DXC Technology</div>'+
'<p>\u0e14\u0e39\u0e15\u0e32\u0e23\u0e32\u0e07\u0e43\u0e19\u0e2b\u0e31\u0e27\u0e02\u0e49\u0e2d\u0e20\u0e32\u0e29\u0e32\u0e2d\u0e31\u0e07\u0e01\u0e24\u0e29 (\u0e40\u0e19\u0e37\u0e49\u0e2d\u0e2b\u0e32\u0e40\u0e2b\u0e21\u0e37\u0e2d\u0e19\u0e01\u0e31\u0e19)</p>'
},
{id:'help-app-simulation',category:'app-features',badge:'info',
title:'\u0e0a\u0e48\u0e27\u0e07\u0e40\u0e27\u0e25\u0e32\u0e08\u0e33\u0e25\u0e2d\u0e07',
content:'<p>\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e08\u0e33\u0e19\u0e27\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e17\u0e35\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e1b\u0e23\u0e30\u0e21\u0e32\u0e13\u0e01\u0e32\u0e23 1\u201360 \u0e40\u0e14\u0e37\u0e2d\u0e19 \u0e04\u0e48\u0e32\u0e40\u0e23\u0e34\u0e48\u0e21\u0e15\u0e49\u0e19 12 \u0e40\u0e14\u0e37\u0e2d\u0e19</p>'
},
{id:'help-app-export',category:'app-features',badge:'info',
title:'\u0e2a\u0e48\u0e07\u0e2d\u0e2d\u0e01 / \u0e19\u0e33\u0e40\u0e02\u0e49\u0e32',
content:'<p>\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e41\u0e25\u0e30\u0e01\u0e39\u0e49\u0e04\u0e37\u0e19\u0e42\u0e1b\u0e23\u0e44\u0e1f\u0e25\u0e4c\u0e40\u0e1b\u0e47\u0e19 JSON \u0e44\u0e1f\u0e25\u0e4c\u0e25\u0e07\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07 \u0e44\u0e21\u0e48\u0e21\u0e35\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e2a\u0e48\u0e07\u0e44\u0e1b\u0e40\u0e0b\u0e34\u0e23\u0e4c\u0e1f\u0e40\u0e27\u0e2d\u0e23\u0e4c</p>'
},
{id:'help-app-sources',category:'app-features',badge:'info',
title:'\u0e41\u0e2b\u0e25\u0e48\u0e07\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25',
content:'<ul style="font-size:10px;line-height:1.6;color:var(--text3);padding-left:18px">'+
'<li>\u0e1e.\u0e23.\u0e1a.\u0e04\u0e38\u0e49\u0e21\u0e04\u0e23\u0e2d\u0e07\u0e41\u0e23\u0e07\u0e07\u0e32\u0e19 \u0e1e.\u0e28. 2541 \u0e21\u0e32\u0e15\u0e23\u0e32 17, 67, 118, 119, 122</li>'+
'<li>\u0e1e.\u0e23.\u0e1a.\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21 \u0e1e.\u0e28. 2533 \u0e21\u0e32\u0e15\u0e23\u0e32 33</li>'+
'<li>\u0e1b\u0e23\u0e30\u0e21\u0e27\u0e25\u0e23\u0e31\u0e29\u0e0e\u0e32\u0e01\u0e23 \u0e21\u0e32\u0e15\u0e23\u0e32 48, 50</li>'+
'<li>\u0e01\u0e0e\u0e01\u0e23\u0e30\u0e17\u0e23\u0e27\u0e07 \u0e1b\u0e23\u0e30\u0e01\u0e32\u0e28\u0e23\u0e32\u0e0a\u0e01\u0e34\u0e08\u0e08\u0e32\u0e19\u0e38\u0e40\u0e1a\u0e01\u0e29\u0e32 12 \u0e18.\u0e04. 2568</li>'+
'</ul>'
}
]},
// ═══════════════════════════════════════════════
// JAPANESE (JA)
// ═══════════════════════════════════════════════
ja:{
title:'\u30d8\u30eb\u30d7\u30fb\u30ea\u30d5\u30a1\u30ec\u30f3\u30b9',
searchPlaceholder:'\u30d8\u30eb\u30d7\u30c8\u30d4\u30c3\u30af\u3092\u691c\u7d22...',
tocTitle:'\u76ee\u6b21',
noResults:'\u8a72\u5f53\u3059\u308b\u30c8\u30d4\u30c3\u30af\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3002',
sections:[
{id:'help-overview',category:'getting-started',badge:'info',
title:'\u30a2\u30d7\u30ea\u6982\u8981',
content:'<p><strong>Cash Flow Planner</strong>\u306f\u30bf\u30a4\u306e\u5f93\u696d\u54e1\u5411\u3051\u500b\u4eba\u8ca1\u52d9\u30b7\u30df\u30e5\u30ec\u30fc\u30b7\u30e7\u30f3\u30c4\u30fc\u30eb\u3067\u3059\u3002\u6bce\u6708\u306e\u7d66\u4e0e\u3001\u6cd5\u5b9a\u63a7\u9664\uff08SSO\u3001\u7a0e\u91d1\u3001\u9000\u8077\u7a4d\u7acb\u57fa\u91d1\uff09\u3001\u4f1a\u793e\u798f\u5229\u3092\u30e2\u30c7\u30eb\u5316\u3057\u3001\u30ad\u30e3\u30c3\u30b7\u30e5\u30d5\u30ed\u30fc\u3092\u4e88\u6e2c\u3057\u307e\u3059\u3002</p>'+
'<ul style="padding-left:18px;margin:6px 0"><li>SSO\u4e0a\u9650\u6539\u9769\u3068\u7d2f\u9032\u7a0e\u306b\u5bfe\u5fdc\u3057\u305f\u6b63\u78ba\u306a\u30bf\u30a4\u7d66\u4e0e\u30e2\u30c7\u30ea\u30f3\u30b0</li><li>\u96e2\u8077\u30b7\u30ca\u30ea\u30aa\u8a08\u753b\uff08\u9000\u8077\u91d1\u3001\u4f11\u6687\u8cb7\u53d6\u3001\u4e88\u544a\u624b\u5f53\uff09</li><li>\u30bf\u30a4\u30e0\u30e9\u30a4\u30f3\u53ef\u8996\u5316</li><li>\u9000\u8077\u30e2\u30b8\u30e5\u30fc\u30eb</li></ul>'+
'<p style="margin-top:8px;font-size:10px;color:var(--text3)">\u3053\u306e\u30a2\u30d7\u30ea\u306f\u30d6\u30e9\u30a6\u30b6\u5185\u3067\u5b8c\u7d50\u3057\u307e\u3059\u3002\u30c7\u30fc\u30bf\u306f\u30b5\u30fc\u30d0\u30fc\u306b\u9001\u4fe1\u3055\u308c\u307e\u305b\u3093\u3002</p>'
},
{id:'help-payroll-tab',category:'getting-started',badge:'info',
title:'\u4f7f\u3044\u65b9: Payroll\u30bf\u30d6',
content:'<p><strong>Payroll</strong>\u30bf\u30d6\u3067\u6bce\u6708\u306e\u53ce\u5165\u3068\u63a7\u9664\u69cb\u9020\u3092\u5b9a\u7fa9\u3057\u307e\u3059\u3002</p>'+
'<ol style="padding-left:18px;margin:8px 0">'+
'<li><strong>\u53ce\u5165\u9805\u76ee</strong> \u2014 \u57fa\u672c\u7d66\u3001\u624b\u5f53\u3001OT\u3001\u30dc\u30fc\u30ca\u30b9\u3002SSO/Tax\u30c1\u30a7\u30c3\u30af\u30dc\u30c3\u30af\u30b9\u3092\u8a2d\u5b9a</li>'+
'<li><strong>\u63a7\u9664\u9805\u76ee</strong> \u2014 SSO\u3001PVD\u3001\u7a0e\u91d1\u3002\u8a08\u7b97\u30e2\u30fc\u30c9\u3092\u9078\u629e</li>'+
'<li><strong>\u4e00\u6642\u9805\u76ee</strong> \u2014 \u30dc\u30fc\u30ca\u30b9\u300113\u30f6\u6708\u76ee\u3001AIP</li>'+
'<li><strong>\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb</strong> \u2014 \u5165\u793e\u65e5\u3001\u751f\u5e74\u6708\u65e5\u3001\u7d66\u4e0e</li>'+
'</ol>'
},
{id:'help-timeline-tab',category:'getting-started',badge:'info',
title:'\u4f7f\u3044\u65b9: Timeline\u30bf\u30d6',
content:'<p><strong>Timeline</strong>\u30bf\u30d6\u306f\u6708\u5225\u306e\u8ca1\u52d9\u4e88\u6e2c\u3092\u7a4d\u307f\u4e0a\u3052\u30a8\u30ea\u30a2\u30c1\u30e3\u30fc\u30c8\u3067\u8868\u793a\u3057\u307e\u3059\u3002</p>'+
'<ul style="padding-left:18px;margin:8px 0">'+
'<li><strong>\u7dd1</strong> = \u624b\u53d6\u308a</li>'+
'<li><strong>\u30aa\u30ec\u30f3\u30b8</strong> = \u7a0e\u91d1</li>'+
'<li><strong>\u9752</strong> = SSO</li>'+
'<li><strong>\u7d2b</strong> = PVD</li>'+
'</ul>'
},
{id:'help-retirement-tab',category:'getting-started',badge:'info',
title:'\u4f7f\u3044\u65b9: \u9000\u8077\u30e2\u30b8\u30e5\u30fc\u30eb',
content:'<p>\u9000\u8077\u6642\u306e\u8ca1\u52d9\u72b6\u6cc1\u3092\u4e88\u6e2c\u3057\u307e\u3059\u3002\u76ee\u6a19\u9000\u8077\u5e74\u9f62\u3092\u8a2d\u5b9a\u3057\u3001SSO\u5e74\u91d1\u3001PVD\u4e00\u6642\u91d1\u3001\u7d2f\u7a4d\u8caf\u84c4\u3092\u78ba\u8a8d\u3067\u304d\u307e\u3059\u3002</p>'
},
{id:'help-sev118',category:'labour-law',badge:'law',
title:'\u9000\u8077\u91d1 \u2014 \u7b2c118\u6761 \u52b4\u50cd\u4fdd\u8b77\u6cd5',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u6cd5\u5f8b \u2014 \u30bf\u30a4\u52b4\u50cd\u4fdd\u8b77\u6cd5 B.E. 2541 \u7b2c118\u6761</div>'+
'<p>\u96c7\u7528\u4e3b\u304c<strong>\u6b63\u5f53\u306a\u7406\u7531\u306a\u304f</strong>\u5f93\u696d\u54e1\u3092\u89e3\u96c7\u3057\u305f\u5834\u5408\u3001\u52e4\u7d9a\u5e74\u6570\u306b\u5fdc\u3058\u305f\u9000\u8077\u91d1\u304c\u652f\u6255\u308f\u308c\u307e\u3059\uff1a</p>'+
'<table class="tbl" style="margin:10px 0"><thead><tr><th>\u52e4\u7d9a\u5e74\u6570</th><th class="r">\u9000\u8077\u91d1\uff08\u65e5\u6570\uff09</th></tr></thead><tbody>'+
'<tr><td>120\u65e5\u672a\u6e80</td><td class="r" style="font-family:var(--mono)">0\u65e5</td></tr>'+
'<tr><td>120\u65e5\uff5e1\u5e74\u672a\u6e80</td><td class="r" style="font-family:var(--mono)">30\u65e5</td></tr>'+
'<tr><td>1\u5e74\uff5e3\u5e74\u672a\u6e80</td><td class="r" style="font-family:var(--mono)">90\u65e5</td></tr>'+
'<tr><td>3\u5e74\uff5e6\u5e74\u672a\u6e80</td><td class="r" style="font-family:var(--mono)">180\u65e5</td></tr>'+
'<tr><td>6\u5e74\uff5e10\u5e74\u672a\u6e80</td><td class="r" style="font-family:var(--mono)">240\u65e5</td></tr>'+
'<tr><td>10\u5e74\uff5e20\u5e74\u672a\u6e80</td><td class="r" style="font-family:var(--mono)">300\u65e5</td></tr>'+
'<tr style="background:var(--success-bg)"><td><strong>20\u5e74\u4ee5\u4e0a</strong></td><td class="r" style="font-family:var(--mono)"><strong>400\u65e5</strong></td></tr>'+
'</tbody></table>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:10px 0">'+
'<strong>\u8a08\u7b97\u5f0f:</strong><br>'+
'\u65e5\u7d66 = \u6708\u7d66 \u00f7 30<br>'+
'\u9000\u8077\u91d1 = \u65e5\u6570 \u00d7 \u65e5\u7d66</div>'
},
{id:'help-sev122',category:'labour-law',badge:'law',
title:'\u7279\u5225\u9000\u8077\u91d1 \u2014 \u7b2c122\u6761',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u6cd5\u5f8b \u2014 \u30bf\u30a4\u52b4\u50cd\u4fdd\u8b77\u6cd5 \u7b2c122\u6761</div>'+
'<p>\u4e8b\u696d\u518d\u7de8\u30fb\u6280\u8853\u5c0e\u5165\u306b\u3088\u308b\u89e3\u96c7\u306e\u5834\u5408\u306e\u307f\u9069\u7528\u3002\u52e4\u7d9a<strong>6\u5e74\u4ee5\u4e0a</strong>\u304c\u6761\u4ef6\u3002</p>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:10px 0">'+
'\u7279\u5225\u9000\u8077\u91d1 = 15\u65e5 \u00d7 \u65e5\u7d66 \u00d7 \u52e4\u7d9a\u5e74\u6570<br>'+
'\u4e0a\u9650: 360\u65e5\u5206\u306e\u8cc3\u91d1</div>'+
'<p><strong>\u96c7\u7528\u4e3b\u306e\u901a\u77e5\u7fa9\u52d9:</strong></p>'+
'<ul style="padding-left:18px;margin:6px 0">'+
'<li>\u52b4\u50cd\u76e3\u7763\u5b98\u306b<strong>60\u65e5\u524d</strong>\u307e\u3067\u306b\u901a\u77e5\u5fc5\u9808</li>'+
'<li>\u901a\u77e5\u3057\u306a\u3044\u5834\u5408: 60\u65e5\u5206\u306e\u8cc3\u91d1\u3092\u8ffd\u52a0\u652f\u6255\u3044</li>'+
'</ul>'+
'<p style="font-size:10px;color:var(--text3)">\u7b2c118\u6761\u306e\u901a\u5e38\u9000\u8077\u91d1\u306b<em>\u52a0\u3048\u3066</em>\u652f\u6255\u308f\u308c\u307e\u3059\u3002</p>'
},
{id:'help-notice17',category:'labour-law',badge:'law',
title:'\u4e88\u544a\u624b\u5f53 \u2014 \u7b2c17\u6761',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u6cd5\u5f8b \u2014 \u30bf\u30a4\u52b4\u50cd\u4fdd\u8b77\u6cd5 \u7b2c17\u6761</div>'+
'<p>\u96c7\u7528\u4e3b\u306f\u89e3\u96c7\u306e<strong>1\u7d66\u4e0e\u30b5\u30a4\u30af\u30eb\u524d</strong>\u306b\u66f8\u9762\u901a\u77e5\u304c\u5fc5\u8981\u3067\u3059\u3002</p>'+
'<ul style="padding-left:18px;margin:8px 0">'+
'<li>\u901a\u77e5\u3057\u306a\u3044\u5834\u5408: <strong>1\u30f6\u6708\u5206\u306e\u7d66\u4e0e</strong>\u3092\u652f\u6255\u3044</li>'+
'<li>\u9000\u8077\u91d1\u3068\u306f\u5225\u3067\u8ffd\u52a0\u652f\u6255</li>'+
'</ul>'
},
{id:'help-leave-cashout',category:'labour-law',badge:'law',
title:'\u5e74\u6b21\u4f11\u6687\u8cb7\u53d6',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u6cd5\u5f8b \u2014 \u52b4\u50cd\u4fdd\u8b77\u6cd5 \u7b2c67\u6761</div>'+
'<div class="help-badge help-badge-company" style="margin-top:4px">\ud83c\udfe2 \u4f1a\u793e \u2014 DXC Technology</div>'+
'<p style="margin-top:8px">\u96e2\u8077\u6642\u3001\u672a\u4f7f\u7528\u306e\u5e74\u6b21\u4f11\u6687\u306f\u73fe\u91d1\u3067\u652f\u6255\u308f\u308c\u307e\u3059\u3002</p>'+
'<table class="tbl" style="margin:6px 0"><thead><tr><th>\u52e4\u7d9a\u5e74\u6570</th><th class="r">\u5e74\u6b21\u4f11\u6687</th></tr></thead><tbody>'+
'<tr><td>5\u5e74\u672a\u6e80</td><td class="r" style="font-family:var(--mono)">15\u65e5</td></tr>'+
'<tr><td>5\uff5e10\u5e74</td><td class="r" style="font-family:var(--mono)">17\u65e5</td></tr>'+
'<tr><td>10\u5e74\u4ee5\u4e0a</td><td class="r" style="font-family:var(--mono)">20\u65e5</td></tr>'+
'</tbody></table>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:6px 0">'+
'\u4f11\u6687\u8cb7\u53d6 = \u65e5\u6570 \u00d7 (\u6708\u7d66 \u00f7 30)</div>'
},
{id:'help-tax-rates',category:'tax',badge:'law',
title:'\u7d2f\u9032\u6240\u5f97\u7a0e\u7387',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u6cd5\u5f8b \u2014 \u6b73\u5165\u6cd5\u5178 \u7b2c48\u6761\u30fb\u7b2c50\u6761</div>'+
'<table class="tbl" style="margin:10px 0"><thead><tr><th>\u8ab2\u7a0e\u6240\u5f97\uff08\u30d0\u30fc\u30c4\uff09</th><th class="r">\u7a0e\u7387</th><th class="r">\u6700\u5927\u7a0e\u984d/\u6bb5</th><th class="r">\u7d2f\u8a08</th></tr></thead><tbody>'+
'<tr><td>0 \u2013 150,000</td><td class="r">\u514d\u7a0e</td><td class="r" style="font-family:var(--mono)">0</td><td class="r" style="font-family:var(--mono)">0</td></tr>'+
'<tr><td>150,001 \u2013 300,000</td><td class="r">5%</td><td class="r" style="font-family:var(--mono)">7,500</td><td class="r" style="font-family:var(--mono)">7,500</td></tr>'+
'<tr><td>300,001 \u2013 500,000</td><td class="r">10%</td><td class="r" style="font-family:var(--mono)">20,000</td><td class="r" style="font-family:var(--mono)">27,500</td></tr>'+
'<tr><td>500,001 \u2013 750,000</td><td class="r">15%</td><td class="r" style="font-family:var(--mono)">37,500</td><td class="r" style="font-family:var(--mono)">65,000</td></tr>'+
'<tr><td>750,001 \u2013 1,000,000</td><td class="r">20%</td><td class="r" style="font-family:var(--mono)">50,000</td><td class="r" style="font-family:var(--mono)">115,000</td></tr>'+
'<tr><td>1,000,001 \u2013 2,000,000</td><td class="r">25%</td><td class="r" style="font-family:var(--mono)">250,000</td><td class="r" style="font-family:var(--mono)">365,000</td></tr>'+
'<tr><td>2,000,001 \u2013 5,000,000</td><td class="r">30%</td><td class="r" style="font-family:var(--mono)">900,000</td><td class="r" style="font-family:var(--mono)">1,265,000</td></tr>'+
'<tr><td>5,000,001+</td><td class="r">35%</td><td class="r" style="font-family:var(--mono)">\u2014</td><td class="r" style="font-family:var(--mono)">\u2014</td></tr>'+
'</tbody></table>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:10px 0">'+
'<strong>\u8ab2\u7a0e\u6240\u5f97</strong> = \u8a55\u4fa1\u6240\u5f97 \u2212 \u7d4c\u8cbb\u63a7\u9664(50%, \u4e0a\u9650\u0e3f100,000) \u2212 \u5404\u7a2e\u63a7\u9664<br>'+
'<strong>\u7a0e\u984d</strong> = \u7d2f\u9032\u7a0e\u7387\u3092\u9069\u7528</div>'
},
{id:'help-tax-separation',category:'tax',badge:'law',
title:'\u96e2\u8077\u6240\u5f97\u306e\u7a0e\u52d9 \u2014 \u7b2c48\u6761(5)',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u6cd5\u5f8b \u2014 \u6b73\u5165\u6cd5\u5178 \u7b2c48\u6761(5) & \u7701\u4ee4\u7b2c126\u53f7</div>'+
'<p>\u96e2\u8077\u6240\u5f97\u306f\u901a\u5e38\u306e\u6240\u5f97\u7a0e\u3088\u308a<strong>\u512a\u904e\u306a\u7a0e\u52d9\u51e6\u7406</strong>\u3092\u53d7\u3051\u307e\u3059\u3002</p>'+
'<h4 style="font-size:11px;font-weight:600;margin:10px 0 4px">\u975e\u8ab2\u7a0e\u90e8\u5206</h4>'+
'<p>\u9000\u8077\u91d1\u306e\u3046\u3061\u4ee5\u4e0b\u306e\u5927\u304d\u3044\u65b9\u304c\u975e\u8ab2\u7a0e\uff1a</p>'+
'<ul style="padding-left:18px;margin:6px 0">'+
'<li>300\u65e5\u5206\u306e\u8cc3\u91d1\u3001\u307e\u305f\u306f</li>'+
'<li>\u0e3f300,000</li>'+
'</ul>'+
'<h4 style="font-size:11px;font-weight:600;margin:10px 0 4px">\u8ab2\u7a0e\u90e8\u5206 \u2014 \u534a\u7387\u8a08\u7b97\u6cd5</h4>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:6px 0">'+
'Step 1: \u8ab2\u7a0e\u5206 = \u7dcf\u984d \u2212 \u975e\u8ab2\u7a0e\u5206<br>'+
'Step 2: \u7d4c\u8cbb\u63a7\u9664 = \u0e3f7,000 \u00d7 \u52e4\u7d9a\u5e74\u6570<br>'+
'Step 3: \u7d14\u984d = Step 1 \u2212 Step 2<br>'+
'Step 4: \u7d14\u984d \u00f7 \u52e4\u7d9a\u5e74\u6570<br>'+
'Step 5: \u7d2f\u9032\u7a0e\u7387\u3092\u9069\u7528<br>'+
'Step 6: \u5e74\u7a0e \u00d7 \u5e74\u6570 \u00f7 2 = <strong>\u6700\u7d42\u7a0e\u984d</strong></div>'
},
{id:'help-tax-exemptions',category:'tax',badge:'law',
title:'\u6240\u5f97\u63a7\u9664\u30fb\u7a0e\u984d\u63a7\u9664\u4e00\u89a7',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u6cd5\u5f8b \u2014 \u6b73\u5165\u6cd5\u5178 & 2026\u5e74\u898f\u5247</div>'+
'<p>\u8a73\u7d30\u306f\u82f1\u8a9e\u7248\u306e\u5b8c\u5168\u306a\u30ab\u30bf\u30ed\u30b0\u3092\u3054\u53c2\u7167\u304f\u3060\u3055\u3044\u3002\u4e3b\u8981\u9805\u76ee\uff1a</p>'+
'<ul style="padding-left:18px;margin:6px 0">'+
'<li>\u57fa\u790e\u63a7\u9664: \u0e3f60,000</li>'+
'<li>\u914d\u5076\u8005\u63a7\u9664: \u0e3f60,000</li>'+
'<li>SSO: \u0e3f10,500/\u5e74</li>'+
'<li>PVD: \u4e0a\u9650\u0e3f500,000</li>'+
'<li>RMF+SSF+ESG+PVD \u5408\u8a08\u4e0a\u9650: \u0e3f500,000</li>'+
'</ul>'
},
{id:'help-sso-contributions',category:'social-security',badge:'law',
title:'SSO\u62e0\u51fa\u91d1\u30eb\u30fc\u30eb',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u6cd5\u5f8b \u2014 \u793e\u4f1a\u4fdd\u969c\u6cd5 B.E.2533 \u7b2c33\u6761</div>'+
'<p><strong>\u5bfe\u8c61:</strong> 15\u301c60\u6b73\u306e\u5168\u6c11\u9593\u90e8\u9580\u5f93\u696d\u54e1</p>'+
'<table class="tbl" style="margin:8px 0"><thead><tr><th>\u5f53\u4e8b\u8005</th><th class="r">\u7387</th><th>\u5099\u8003</th></tr></thead><tbody>'+
'<tr><td>\u5f93\u696d\u54e1</td><td class="r" style="font-family:var(--mono)">5%</td><td>\u6bce\u6708\u7d66\u4e0e\u304b\u3089\u63a7\u9664</td></tr>'+
'<tr><td>\u96c7\u7528\u4e3b</td><td class="r" style="font-family:var(--mono)">5%</td><td>\u30de\u30c3\u30c1\u30f3\u30b0\u62e0\u51fa</td></tr>'+
'<tr><td>\u653f\u5e9c</td><td class="r" style="font-family:var(--mono)">2.75%</td><td>\u56fd\u304c\u8ca0\u62c5</td></tr>'+
'</tbody></table>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:10px 0">'+
'\u62e0\u51fa\u30d9\u30fc\u30b9 = min(\u6708\u7d66, \u8cc3\u91d1\u4e0a\u9650)<br>'+
'SSO = \u30d9\u30fc\u30b9 \u00d7 5%<br>'+
'\u4e0a\u9650: \u0e3f875/\u6708 (2026\u5e74+)</div>'
},
{id:'help-sso-ceiling',category:'social-security',badge:'law',
title:'\u8cc3\u91d1\u4e0a\u9650\u984d\u6539\u9769',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u6cd5\u5f8b \u2014 \u5b98\u5831 2025\u5e7412\u670812\u65e5</div>'+
'<p>\u8a73\u7d30\u30c6\u30fc\u30d6\u30eb\u306f\u82f1\u8a9e\u7248\u3092\u53c2\u7167\u3002Phase 1: \u0e3f17,500 (2026-2028), Phase 2: \u0e3f20,000 (2029-2031), Phase 3: \u0e3f23,000 (2032+)</p>'
},
{id:'help-sso-unemployment',category:'social-security',badge:'law',
title:'\u5931\u696d\u7d66\u4ed8',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u6cd5\u5f8b \u2014 \u793e\u4f1a\u4fdd\u969c\u6cd5 \u7b2c7\u7ae0</div>'+
'<table class="tbl" style="margin:10px 0"><thead><tr><th>\u7406\u7531</th><th class="r">\u7d66\u4ed8\u7387</th><th class="r">\u6700\u5927\u671f\u9593</th></tr></thead><tbody>'+
'<tr style="background:var(--success-bg)"><td><strong>\u89e3\u96c7</strong></td><td class="r" style="font-family:var(--mono)">50%</td><td class="r" style="font-family:var(--mono)">180\u65e5 (6\u30f6\u6708)</td></tr>'+
'<tr><td>\u81ea\u5df1\u90fd\u5408\u9000\u8077</td><td class="r" style="font-family:var(--mono)">30%</td><td class="r" style="font-family:var(--mono)">90\u65e5 (3\u30f6\u6708)</td></tr>'+
'</tbody></table>'+
'<p>\u8cc3\u91d1\u4e0a\u9650: \u0e3f17,500\u3002\u96e2\u8077\u5f8c<strong>30\u65e5\u4ee5\u5185</strong>\u306b\u96c7\u7528\u4e8b\u52d9\u6240\u3067\u767b\u9332\u304c\u5fc5\u8981\u3002</p>'
},
{id:'help-sso-pension',category:'social-security',badge:'law',
title:'\u8001\u9f62\u5e74\u91d1',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u6cd5\u5f8b \u2014 \u793e\u4f1a\u4fdd\u969c\u6cd5 \u7b2c5\u7ae0</div>'+
'<p><strong>55\u6b73\u4ee5\u4e0a</strong>\u304b\u3064<strong>180\u30f6\u6708\u4ee5\u4e0a</strong>\u306e\u62e0\u51fa\u3067\u6708\u984d\u5e74\u91d1\u3002</p>'+
'<div style="background:var(--bg3);padding:10px 14px;border-radius:var(--radius-sm);font-family:var(--mono);font-size:11px;line-height:1.8;margin:10px 0">'+
'\u57fa\u672c\u5e74\u91d1 = \u5e73\u5747\u8cc3\u91d1\u4e0a\u9650 \u00d7 20%<br>'+
'+ 1.5% \u00d7 (180\u30f6\u6708\u8d85\u904e\u5206 \u00f7 12)<br><br>'+
'180\u30f6\u6708\u672a\u6e80: \u4e00\u6642\u91d1\u8fd4\u9084</div>'
},
{id:'help-sso-benefits',category:'social-security',badge:'law',
title:'SSO\u7d66\u4ed8\u91d1\u6982\u8981 (2026\u5e74)',
content:'<p>\u82f1\u8a9e\u7248\u306e\u8868\u3092\u53c2\u7167\u3002\u7a98\u75c5\u30fb\u969c\u5bb3\u30fb\u5931\u696d: \u0e3f8,750/\u6708\u3001\u51fa\u7523: \u0e3f26,250\u3001\u6b7b\u4ea1: \u0e3f105,000\u3001\u5e74\u91d1(15\u5e74): \u0e3f3,500/\u6708</p>'
},
{id:'help-sso-compliance',category:'social-security',badge:'law',
title:'\u4e3b\u306a\u30b3\u30f3\u30d7\u30e9\u30a4\u30a2\u30f3\u30b9\u4e8b\u9805',
content:'<ul style="padding-left:18px;margin:8px 0;font-size:11px;line-height:1.7">'+
'<li>\u7d0d\u4ed8\u671f\u9650: <strong>\u7fcc\u670815\u65e5</strong></li>'+
'<li>\u5ef6\u6ede\u7f70\u5247: <strong>\u6708\u30012%</strong></li>'+
'<li>\u767b\u9332\u671f\u9650: <strong>\u5165\u793e\u304b\u308930\u65e5\u4ee5\u5185</strong></li>'+
'<li>\u88dc\u511f\u958b\u59cb: <strong>\u521d\u65e5\u304b\u3089</strong></li>'+
'</ul>'
},
{id:'help-sso-setup',category:'social-security',badge:'info',
title:'\u30a2\u30d7\u30ea\u3067\u306eSSO\u8a2d\u5b9a',
content:'<ol style="padding-left:18px"><li><strong>Payroll</strong>\u30bf\u30d6\u3078</li><li>\u53ce\u5165\u9805\u76ee: <strong>SSO</strong>\u30c1\u30a7\u30c3\u30af\u30dc\u30c3\u30af\u30b9\u3092\u30aa\u30f3</li><li>\u63a7\u9664\u9805\u76ee: <strong>"% of SSO Base"</strong>\u3001\u7387=<strong>5%</strong>\u3001\u4e0a\u9650=<strong>\u0e3f875</strong></li></ol>'
},
{id:'help-pvd-overview',category:'provident-fund',badge:'regulation',
title:'\u9000\u8077\u7a4d\u7acb\u57fa\u91d1\u306e\u4ed5\u7d44\u307f',
content:'<div class="help-badge help-badge-regulation">\ud83d\udcdc \u898f\u5236 \u2014 SEC / \u9000\u8077\u7a4d\u7acb\u57fa\u91d1\u6cd5 B.E.2530</div>'+
'<p>PVD\u306f\u96c7\u7528\u4e3b\u304c\u63d0\u4f9b\u3059\u308b\u4efb\u610f\u306e\u9000\u8077\u8caf\u84c4\u5236\u5ea6\u3067\u3059\u3002</p>'+
'<ul style="padding-left:18px;margin:8px 0">'+
'<li>\u5f93\u696d\u54e1\u62e0\u51fa\u5206: \u5e38\u306b100%\u81ea\u5206\u306e\u3082\u306e</li>'+
'<li>\u96c7\u7528\u4e3b\u62e0\u51fa\u5206: \u30d9\u30b9\u30c6\u30a3\u30f3\u30b0\u30b9\u30b1\u30b8\u30e5\u30fc\u30eb\u306b\u5f93\u3046</li>'+
'<li>DXC: \u5f93\u696d\u54e1 3% + \u4f1a\u793e 3%</li>'+
'</ul>'
},
{id:'help-pvd-vesting',category:'provident-fund',badge:'company',
title:'DXC\u30d9\u30b9\u30c6\u30a3\u30f3\u30b0\u30b9\u30b1\u30b8\u30e5\u30fc\u30eb',
content:'<div class="help-badge help-badge-company">\ud83c\udfe2 \u4f1a\u793e \u2014 DXC Technology</div>'+
'<table class="tbl" style="margin:10px 0"><thead><tr><th>\u52e4\u7d9a\u5e74\u6570</th><th class="r">Vesting %</th></tr></thead><tbody>'+
'<tr><td>3\u5e74\u672a\u6e80</td><td class="r" style="font-family:var(--mono);color:var(--danger)">0%</td></tr>'+
'<tr><td>3\u5e74</td><td class="r" style="font-family:var(--mono)">20%</td></tr>'+
'<tr><td>4\u5e74</td><td class="r" style="font-family:var(--mono)">40%</td></tr>'+
'<tr><td>5\u5e74</td><td class="r" style="font-family:var(--mono)">60%</td></tr>'+
'<tr><td>6\u5e74</td><td class="r" style="font-family:var(--mono)">80%</td></tr>'+
'<tr style="background:var(--success-bg)"><td><strong>7\u5e74\u4ee5\u4e0a</strong></td><td class="r" style="font-family:var(--mono)"><strong>100%</strong></td></tr>'+
'</tbody></table>'
},
{id:'help-pvd-withdrawal',category:'provident-fund',badge:'law',
title:'\u5f15\u51fa\u30b7\u30aa\u30d7\u30b7\u30e7\u30f3\u3068\u7a0e\u52d9',
content:'<div class="help-badge help-badge-law">\u2696\ufe0f \u6cd5\u5f8b \u2014 \u6b73\u5165\u6cd5\u5178 & PVD\u6cd5</div>'+
'<ul style="padding-left:18px;margin:8px 0">'+
'<li><strong>\u73fe\u91d1\u5316:</strong> \u52e4\u7d9a5\u5e74\u672a\u6e80\u307e\u305f\u306f55\u6b73\u672a\u6e80\u3067\u8ab2\u7a0e</li>'+
'<li><strong>RMF\u79fb\u7ba1:</strong> \u975e\u8ab2\u7a0e\u300255\u6b73\u307e\u3067\u4fdd\u6709</li>'+
'<li><strong>\u4fdd\u7559/\u79fb\u7ba1:</strong> \u65b0\u96c7\u7528\u4e3b\u306e\u57fa\u91d1\u3078\u3002\u7a0e\u306a\u3057</li>'+
'</ul>'
},
{id:'help-dxc-aip',category:'company-benefits',badge:'company',
title:'AIP\u30dc\u30fc\u30ca\u30b9',
content:'<div class="help-badge help-badge-company">\ud83c\udfe2 \u4f1a\u793e \u2014 DXC Technology</div>'+
'<p>\u696d\u7e3e\u9023\u52d5\u5e74\u6b21\u30dc\u30fc\u30ca\u30b9\u3002\u76ee\u6a19: \u57fa\u672c\u7d66\u306e5\uff5e20%\u3002\u901a\u5e383\u6708\u652f\u6255\u3044\u3002</p>'
},
{id:'help-dxc-13th',category:'company-benefits',badge:'company',
title:'13\u30f6\u6708\u76ee\u306e\u7d66\u4e0e',
content:'<div class="help-badge help-badge-company">\ud83c\udfe2 \u4f1a\u793e \u2014 DXC Technology</div>'+
'<p>12\u6708\u306b1\u30f6\u6708\u5206\u306e\u57fa\u672c\u7d66\u3092\u652f\u7d66\u3002\u4e2d\u9014\u5165\u793e\u306f\u6708\u5272\u308a\u3002</p>'
},
{id:'help-dxc-leave',category:'company-benefits',badge:'company',
title:'DXC\u4f11\u6687\u5236\u5ea6',
content:'<div class="help-badge help-badge-company">\ud83c\udfe2 \u4f1a\u793e \u2014 DXC Technology</div>'+
'<p>\u82f1\u8a9e\u7248\u306e\u30c6\u30fc\u30d6\u30eb\u3092\u53c2\u7167\u3002\u5e74\u6b21\u4f11\u6687: 5\u5e74\u672a\u6e80=15\u65e5, 5-10\u5e74=17\u65e5, 10\u5e74+=20\u65e5</p>'
},
{id:'help-app-simulation',category:'app-features',badge:'info',
title:'\u30b7\u30df\u30e5\u30ec\u30fc\u30b7\u30e7\u30f3\u671f\u9593',
content:'<p>1\uff5e60\u30f6\u6708\u306e\u4e88\u6e2c\u671f\u9593\u3002\u30c7\u30d5\u30a9\u30eb\u30c8: 12\u30f6\u6708\u3002\u9577\u671f\u306f\u9000\u8077\u8a08\u753b\u306b\u6709\u7528\u3002</p>'
},
{id:'help-app-export',category:'app-features',badge:'info',
title:'\u30a8\u30af\u30b9\u30dd\u30fc\u30c8 / \u30a4\u30f3\u30dd\u30fc\u30c8',
content:'<p>\u30d7\u30ed\u30d5\u30a1\u30a4\u30eb\u3092JSON\u3067\u4fdd\u5b58\u30fb\u5fa9\u5143\u3002\u30c7\u30fc\u30bf\u306f\u30ed\u30fc\u30ab\u30eb\u306e\u307f\u3002</p>'
},
{id:'help-app-sources',category:'app-features',badge:'info',
title:'\u51fa\u5178\u30fb\u53c2\u8003\u6587\u732e',
content:'<ul style="font-size:10px;line-height:1.6;color:var(--text3);padding-left:18px">'+
'<li>\u30bf\u30a4\u52b4\u50cd\u4fdd\u8b77\u6cd5 B.E. 2541 \u7b2c17, 67, 118, 119, 122\u6761</li>'+
'<li>\u793e\u4f1a\u4fdd\u969c\u6cd5 B.E. 2533 \u7b2c33\u6761</li>'+
'<li>\u6b73\u5165\u6cd5\u5178 \u7b2c48, 50\u6761</li>'+
'<li>\u9000\u8077\u7a4d\u7acb\u57fa\u91d1\u6cd5 B.E. 2530</li>'+
'</ul>'
}
]}
};

/* ── Badge & rendering CSS ── */
var HELP_CSS_INJECTED=false;
function injectHelpCSS(){
if(HELP_CSS_INJECTED)return;HELP_CSS_INJECTED=true;
var s=document.createElement('style');
s.textContent=`
.help-badge{display:inline-block;font-size:10px;font-weight:600;padding:2px 8px;border-radius:4px;margin-bottom:6px}
.help-badge-law{background:#dbeafe;color:#1e40af;border:1px solid #93c5fd}
.help-badge-company{background:#ede9fe;color:#6d28d9;border:1px solid #c4b5fd}
.help-badge-regulation{background:#ffedd5;color:#c2410c;border:1px solid #fdba74}
.help-search-bar{width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:12px;background:var(--bg2);color:var(--text1);margin-bottom:12px;box-sizing:border-box}
.help-search-bar:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 2px rgba(59,130,246,0.15)}
.help-toc{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:16px}
.help-toc h4{font-size:12px;font-weight:600;margin:0 0 8px;color:var(--text1)}
.help-toc-cat{font-size:11px;font-weight:600;color:var(--primary);margin:8px 0 4px;cursor:default}
.help-toc a{display:block;font-size:10px;color:var(--text2);text-decoration:none;padding:2px 0 2px 12px;line-height:1.5}
.help-toc a:hover{color:var(--primary);text-decoration:underline}
.help-section{margin-bottom:16px;padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg1)}
.help-section.help-hidden{display:none}
.help-section-title{font-size:12px;font-weight:600;margin:0 0 8px;color:var(--text1);cursor:pointer}
.help-section-title:hover{color:var(--primary)}
.help-section-body{font-size:11px;line-height:1.7;color:var(--text2)}
.help-section-body p{margin:0 0 6px}
.help-cat-header{font-size:13px;font-weight:700;color:var(--primary);margin:18px 0 8px;padding-bottom:4px;border-bottom:2px solid var(--primary)}
.help-cat-header:first-child{margin-top:0}
.help-highlight{background:rgba(250,204,21,0.25);border-color:var(--warning)}
`;
document.head.appendChild(s)}

/* ── Language toggle ── */
function setHelpLang(l){HELP_LANG=l;
document.querySelectorAll('[id^="hl-"]').forEach(function(b){b.style.fontWeight=b.id==='hl-'+l?'700':'400'});
renderHelp()}

/* ── Search function ── */
function helpSearch(query){
var q=query.toLowerCase().trim();
var sections=document.querySelectorAll('.help-section');
var count=0;
sections.forEach(function(sec){
if(!q){sec.classList.remove('help-hidden','help-highlight');count++;return}
var title=(sec.getAttribute('data-title')||'').toLowerCase();
var text=(sec.textContent||'').toLowerCase();
if(title.indexOf(q)>=0||text.indexOf(q)>=0){
sec.classList.remove('help-hidden');
sec.classList.add('help-highlight');
count++;
}else{
sec.classList.add('help-hidden');
sec.classList.remove('help-highlight');
}
});
var catHeaders=document.querySelectorAll('.help-cat-header');
catHeaders.forEach(function(h){
var cat=h.getAttribute('data-cat');
var visible=document.querySelectorAll('.help-section[data-cat="'+cat+'"]:not(.help-hidden)');
h.style.display=visible.length?'':'none';
});
var noRes=document.getElementById('help-no-results');
if(noRes)noRes.style.display=count?'none':'block';
}

/* ── Main render function ── */
function renderHelp(){
injectHelpCSS();
var L=HELP_DATA[HELP_LANG]||HELP_DATA.en;
var sections=L.sections;
var cats=HELP_CATEGORIES;
var catOrder=['getting-started','labour-law','tax','social-security','provident-fund','company-benefits','app-features'];

// Update title
var titleEl=document.getElementById('help-title');
if(titleEl)titleEl.textContent=L.title;

var h='';

// Search bar
h+='<div style="position:sticky;top:0;background:var(--bg1);z-index:2;padding:4px 0 8px">';
h+='<input class="help-search-bar" type="text" placeholder="'+L.searchPlaceholder+'" oninput="helpSearch(this.value)" id="help-search-input">';
h+='</div>';

// TOC
h+='<div class="help-toc">';
h+='<h4>'+L.tocTitle+'</h4>';
catOrder.forEach(function(catKey){
var cat=cats[catKey];
if(!cat)return;
var catSections=sections.filter(function(s){return s.category===catKey});
if(!catSections.length)return;
h+='<div class="help-toc-cat">'+cat.icon+' '+cat[HELP_LANG]+'</div>';
catSections.forEach(function(s){
h+='<a href="#" onclick="document.getElementById(\''+s.id+'\').scrollIntoView({behavior:\'smooth\',block:\'start\'});return false">'+s.title+'</a>';
});
});
h+='</div>';

// No results message
h+='<div id="help-no-results" style="display:none;text-align:center;padding:20px;color:var(--text3);font-size:12px">'+L.noResults+'</div>';

// Sections grouped by category
var lastCat='';
sections.forEach(function(s){
if(s.category!==lastCat){
lastCat=s.category;
var cat=cats[s.category]||{icon:'',en:s.category,th:s.category,ja:s.category};
h+='<div class="help-cat-header" data-cat="'+s.category+'">'+cat.icon+' '+cat[HELP_LANG]+'</div>';
}
var badgeClass='';
if(s.badge==='law')badgeClass=' data-badge="law"';
else if(s.badge==='company')badgeClass=' data-badge="company"';
else if(s.badge==='regulation')badgeClass=' data-badge="regulation"';
h+='<div class="help-section" id="'+s.id+'" data-cat="'+s.category+'" data-title="'+s.title.replace(/"/g,'&quot;')+'"'+badgeClass+'>';
h+='<div class="help-section-title" onclick="var b=this.nextElementSibling;b.style.display=b.style.display===\'none\'?\'\':\'none\'">'+s.title+'</div>';
h+='<div class="help-section-body">'+s.content+'</div>';
h+='</div>';
});

// Sources footer
h+='<div style="margin-top:16px;font-size:9px;color:var(--text3);text-align:center">Cash Flow Planner Help v2.0 \u2014 Last updated Sep 2026</div>';

var contentEl=document.getElementById('help-content');
if(contentEl)contentEl.innerHTML=h;
}
