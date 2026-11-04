import { optionsFor, type Criterion, type Globals, type OptionSpec, type Vehicle } from './engine';

/** Every external source used for a default value. Retrieved Nov 1, 2026. */
export const SRC: Record<string, { label: string; url: string }> = {
  epaGas: { label: 'EPA: 8,887 g CO2 per gallon of gasoline', url: 'https://www.epa.gov/greenvehicles/greenhouse-gas-emissions-typical-passenger-vehicle' },
  lxMpg: { label: 'EPA ratings for the 1999 LX 470: 12 city / 15 hwy / 13 combined', url: 'https://mpgbuddy.com/cars/lexus/lx-470/1999' },
  caTradeIn: { label: 'California taxes the full price; a trade-in does not reduce sales tax', url: 'https://www.salestaxhandbook.com/california/sales-tax-vehicles' },
  lxKbb: { label: 'KBB: 1999 LX 470 resale $6,713, depreciated 7% in 3 yrs', url: 'https://www.kbb.com/lexus/lx/1999/lx-470-sport-utility-4d' },
  lxEdmunds: { label: 'Edmunds: 1999 LX 470 price estimate $3,542-$5,716; 4 listings avg $11,209; roof strength not tested', url: 'https://edmunds.com/lexus/lx-470/1999/review' },
  lxCr: { label: 'Consumer Reports: stability control became standard in 2000', url: 'https://www.consumerreports.org/cars/lexus/lx/2000/overview/' },
  caGas: { label: 'California gas: $6.189 on Sep 28, 2026; $3.977 low in January (EIA/AAA)', url: 'https://californiatoday.com/news/gas/california-gas-prices-fall-12-cents-after-coming-within-4-4-cents-of-the-2022-record/' },
  caGasAvg: { label: 'California 2026 year-to-date average regular: $5.27 (EIA weekly)', url: 'https://usgasgauge.com/gas-prices/california/history' },
  pgeEv: { label: 'PG&E EV rate plans (off-peak 12am-3pm)', url: 'https://www.pge.com/en/account/rate-plans/electric-vehicles.html' },
  pgeCost: { label: 'EnergySage: EV2-A off-peak ~23c/kWh summer; PG&E TOU rates 2026', url: 'https://www.energysage.com/electricity/pge-peak-hours/' },
  pgeUtil: { label: 'Utility Check: PG&E EV2-A 31c off-peak, 62c peak (2026)', url: 'https://utilitycheck.co/blog/pge-rate-plans-explained' },
  egrid: { label: 'EPA eGRID2021: California (CAMX) 533.6 lb CO2e/MWh, 4.4% grid loss', url: 'https://www.epa.gov/system/files/documents/2023-01/eGRID2021_summary_tables.pdf' },
  lcaAutocar: { label: 'Autocar: ~9 t to build an EV vs ~6 t for a petrol car', url: 'https://autocar.co.uk/node/112177' },
  lcaLowcvp: { label: 'LowCVP/Ricardo: EV production emissions ~8.8 t CO2e, 46% before the first mile', url: 'https://www.zemo.org.uk/assets/workingdocuments/MC-P-11-15a%20Lifecycle%20emissions%20report.pdf' },
  lcaTc: { label: 'TechCrunch: EV battery embodied emissions range ~8-20 t across 50 studies', url: 'https://techcrunch.com/2021/08/22/the-tough-calculus-of-emissions-and-the-future-of-evs/amp' },
  lcaIrish: { label: 'Irish Times letter (Aug 2026): new medium EV ~9-10 t at the factory gate', url: 'https://www.irishtimes.com/opinion/letters/2026/08/28/why-replace-a-perfectly-good-car-with-a-new-electric-one/' },
  myPrice: { label: 'Motor1: Model Y Standard $41,630 with destination', url: 'https://www.motor1.com/news/775008/tesla-model-y-standard-pricing-range-details/' },
  myLease: { label: 'Autoblog Sept 2026: Model Y RWD lease $499/mo', url: 'https://www.autoblog.com/carbuying/tesla-model-y-lease-deals-september-2026' },
  myLeaseDas: { label: 'Yahoo Autos: $459/mo lease had $4,155 due at signing, 36 mo, 10k mi/yr (Autoblog says initial amount rose $40)', url: 'https://autos.yahoo.com/deals-and-buying-guides/articles/tesla-rolls-incredible-model-y-150000496.html' },
  myEff: { label: 'EVChargingStations: Model Y RWD ~4 mi/kWh', url: 'https://evchargingstations.com/chargingnews/tesla-model-y-most-range/' },
  myIihs: { label: 'IIHS (Sep 3, 2026): 2026-27 Model Y earns Top Safety Pick+', url: 'https://iihs.org/news/detail/two-additional-models-garner-top-safety-pick-awards' },
  myDep: { label: 'iSeeCars via AOL: Model Y loses ~61% over 5 yrs (Jalopnik: 57.8%)', url: 'https://www.aol.com/articles/tesla-resale-values-revealed-models-160000121.html' },
  r2Price: { label: 'OC Business Journal: R2 launches at $57,990; $53,990 and $48,490 trims follow', url: 'https://www.ocbj.com/automobiles/rivian-automotive-reveals-r2-pricing-starting-at-57990/' },
  r2Lease: { label: 'Rivian offer text: R2 Performance $57,990, $829/mo, $5,724 due at signing', url: 'https://rivianforums.com/forum/posts/1015765/' },
  r2Eff: { label: 'Electrek: R2 Performance EPA 105 MPGe, 32 kWh/100 mi', url: 'https://electrek.co/2026/05/29/rivian-r2-epa-efficiency-matches-tesla-model-y' },
  r2Real: { label: 'Electrek: R2 used 18-26% more energy than Model Y in a back-to-back test', url: 'https://electrek.co/2026/07/27/rivian-r2-tesla-model-y-real-world-efficiency-test/' },
  r2Plant: { label: 'NRDC: Rivian reopened the shuttered Mitsubishi plant in Normal, IL', url: 'https://www.nrdc.org/stories/story-normal-car-factory-abandoned-gas-guzzlers-soon-be-buzzing-electric-vehicles' },
  r2Union: { label: 'Manufacturing.net: Rivian Normal plant is not unionized', url: 'https://www.manufacturing.net/home/news/21952936/sources-rivian-to-build-5b-electric-truck-plant-in-georgia' },
  boltLease: { label: 'AutoFinder (Oct 2026): Bolt LT $28,995 MSRP, $477/mo, $2,977 due, 36 mo, 12k mi/yr', url: 'https://autofinder.com/deals/lease/chevrolet/bolt/2027' },
  boltRange: { label: 'InsideEVs: 2027 Bolt vs 2026 Nissan Leaf (range and size)', url: 'https://insideevs.com/reviews/775349/2027-chevrolet-bolt-vs-2026-nissan-leaf/' },
  boltEpa: { label: 'fueleconomy.gov: 2027 Bolt 120 MPGe, 28 kWh/100 mi, 262 mi EPA range', url: 'https://www.fueleconomy.gov/feg/PowerSearch.do?action=noform&path=1&year1=2027&year2=2027&make=Chevrolet&baseModel=Bolt&srchtyp=ymm&pageno=1&rowLimit=50' },
  boltEnd: { label: 'BGR: GM has decided to discontinue the Bolt (2027 model)', url: 'https://www.bgr.com/2087242/cheapest-ev-gm-chevy-bolt-end-production/' },
  evDep: { label: 'iSeeCars 2026: EVs lose 57.2% in 5 yrs vs 41.8% for all vehicles; Leaf 63.1%', url: 'https://evseekers.com/ev-depreciation-by-brand/' },
  fremont: { label: 'Automotive Logistics: Tesla bought the former GM/Toyota Fremont plant in 2010', url: 'https://www.automotivelogistics.media/ev-and-battery/electric-vehicle-firm-rivian-buys-former-mitsubishi-plant-in-illinois/189384' },
  teslaUnion: { label: 'Wards Auto: UAW organizing at Tesla Fremont led to a legal battle (older report)', url: 'https://www.wardsauto.com/news/archive-wards-uaw-wants-role-in-building-lincoln-s-new-ev/793985/' },
  amnesty: { label: 'Amnesty 2024 EV supply-chain ranking: Tesla 49/90, GM 32/90', url: 'https://www.carscoops.com/?p=3111879' },
  aaa: { label: 'AAA Your Driving Costs 2025: maintenance, repair, tires by category', url: 'https://newsroom.aaa.com/wp-content/uploads/2025/09/AAA-Brochure-Your-Driving-Cost-9.2025.pdf' },
  aaaIns: { label: 'AAA 2025 average full-coverage insurance $1,694/yr (via FreeFinCalc)', url: 'https://www.freefincalc.net/total-cost-of-ownership-calculator' },
  apr: { label: 'Edmunds Q3 2026: average new-car APR 7.0%', url: 'https://www.click2houston.com/news/local/2026/10/19/new-car-payments-hit-record-787-a-month-as-buyers-take-on-longer-loans-report-finds/' },
  aprExp: { label: 'Experian Q2 2026: average new-car APR 6.35%', url: 'https://www.experian.com/blogs/ask-experian/auto-loan-rates-financing/' },
  credit: { label: 'Experian: federal EV tax credit ended Sept 30, 2025', url: 'https://www.experian.com/blogs/ask-experian/pros-cons-of-buying-electric-car/' },
  charger: { label: 'The Chargeport: federal charger credit (30C) ended June 30, 2026', url: 'https://thechargeport.com/deals' },
  aaaCost: { label: 'AAA Your Driving Costs 2025: $11,577/yr average new vehicle (fuel 13.0c/mi, maintenance 11.04c/mi)', url: 'https://newsroom.aaa.com/wp-content/uploads/2025/09/UPDATE-AAA-Fact-Sheet-Your-Driving-Cost-9.2025-1.pdf' },
  epaAvg: { label: 'EPA: the average passenger vehicle emits about 400 g CO2 per mile (tailpipe)', url: 'https://www.epa.gov/greenvehicles/greenhouse-gas-emissions-typical-passenger-vehicle' },
  gasUp: { label: 'GLEC 2024 well-to-tank gasoline: 0.7548 kg CO2e/litre (~2.86 kg/gal)', url: 'https://www.climatiq.io/data/emission-factor/b394f9d7-2505-4165-977d-92b7f0fc5392' },
  gasUp2: { label: 'Study: conventional gasoline well-to-pump 12.23 kg CO2e/GJ (~1.4 kg/gal), the low end of published ranges', url: 'https://pure.ewha.ac.kr/en/publications/welltowheel-greenhouse-gas-emissions-of-e-gasoline-insights-from-/' },
  irs: { label: 'IRS Publication 6126: car-loan interest deduction rules', url: 'https://www.irs.gov/pub/irs-pdf/p6126.pdf' },
  irsPhase: { label: 'NerdWallet: deduction falls $200 per $1,000 of income over $100k ($200k joint)', url: 'https://www.nerdwallet.com/article/loans/auto-loans/big-beautiful-bill-car-buyers' },
  irsYears: { label: 'Thomson Reuters: deduction applies to tax years 2025-2028, $10,000 per return', url: 'https://tax.thomsonreuters.com/news/2025-2028-vehicle-loan-interest-deduction-what-you-need-to-know/' },
  mfe: { label: 'CARB: MyFirstEV launched Aug 7, 2026 ($3,500 new / $1,750 used, point of sale)', url: 'https://ww2.arb.ca.gov/news/california-launches-myfirstev-instant-rebate-program-first-time-buyers' },
  mfeSlides: { label: 'CARB workgroup slides (Aug 27, 2026): no income limit, stacking allowed, Tesla funding closed, Rivian/Lucid exempt from price cap', url: 'https://ww2.arb.ca.gov/sites/default/files/2026-08/Slides_Aug27_MyFirstEV_Workgroup.pdf' },
  mfeCap: { label: 'Electrek: $50,000 MSRP cap; California-headquartered Rivian and Lucid exempt', url: 'https://electrek.co/2026/07/13/california-ev-rebate-rivian-lucid-tesla/' },
  mfeGuide: { label: 'Coltura: MyFirstEV rules, automakers, stacking, Clean Cars 4 All income limits', url: 'https://coltura.org/electric-vehicle-rebate-california/' },
  cc4a: { label: 'Bay Area Air District: Clean Cars for All program overview', url: 'https://www.baaqmd.gov/Funding-and-Incentives/Residents/Clean-Cars-for-All/Program-Overview' },
  cc4aFlyer: { label: 'Air District flyer: $5,500-$9,500 BEV, $5,000-$7,000 hybrid, up to $2,000 charger', url: 'https://www.baaqmd.gov/~/media/landing-pages/ccfa/resources/ccfa-flyer-pdf.pdf?la=en' },
  hybDep: { label: 'iSeeCars 2026 via Ford Authority: hybrids lose 35.4% in 5 yrs, all vehicles 41.8%', url: 'https://fordauthority.com/2026/04/ford-mustang-mach-e-among-highest-depreciating-vehicles/' },
  gasDep: { label: 'GoBankingRates/iSeeCars: Corolla 31.3% 5-yr depreciation', url: 'https://www.gobankingrates.com/loans/auto/affordable-cars-that-will-be-even-cheaper-in-2026/' },
  rav4Price: { label: 'Jalopnik: 2026 RAV4 LE hybrid $33,350 with destination', url: 'https://www.jalopnik.com/2030492/hybrid-only-2026-toyota-rav4-pricing/' },
  rav4Mpg: { label: 'Toyota dealer: EPA 47/40/43 mpg for RAV4 LE FWD hybrid', url: 'https://www.gatewaytoyota.com/2026-toyota-rav4-specs-features-model-review-toms-river-nj.htm' },
  rav4Lease: { label: 'Toyota SoCal: RAV4 LE hybrid lease $299/mo, $3,999 due, 36 mo, 10k mi/yr', url: 'https://www.toyota.com/socal/deals-incentives/series/rav4/' },
  camryPrice: { label: 'Toyota: Camry LE hybrid $29,300, 51 mpg combined', url: 'https://www.toyota.com/camry/camry-vs-sonata' },
  camryDest: { label: 'SlashGear: $1,195 destination fee on 2026 Camry', url: 'https://www.slashgear.com/2182491/2026-toyota-camry-hybrid-review/' },
  camryMpg: { label: 'fueleconomy.gov: 2026 Camry Hybrid LE FWD 51 mpg combined', url: 'https://www.fueleconomy.gov/feg/PowerSearch.do?action=noform&path=1&year1=2026&year2=2026&make=Toyota&baseModel=Camry&srchtyp=ymm&pageno=1&rowLimit=50' },
  camry2027: { label: 'AutoGuide (Oct 2026): 2027 Camry LE $29,700 before destination, arriving this fall', url: 'https://www.autoguide.com/auto/2027-toyota-camry-arrives-this-fall-with-up-to-51-mpg-44640241' },
  hybLease: { label: 'TrueCar (May 2026): Camry hybrid $345/mo, CR-V $372/mo, 36 mo, $2,000 due', url: 'https://truecar.com/deals/fuel-hybrid/' },
  crvHyb: { label: 'Edmunds listings: CR-V Sport Hybrid AWD $38,580 MSRP, 40/34 mpg (37 combined)', url: 'https://www.edmunds.com/new-honda-cr-v-for-sale-belgium-wi/' },
  crvGas: { label: 'Cars.com: 2026 CR-V LX $32,315 with destination', url: 'https://cars.com/articles/how-much-is-the-2026-honda-cr-v-510202/' },
  crvMpg: { label: 'Cars.com: CR-V gas 28/33/30 mpg FWD; hybrid 43/36/40 FWD, 40/34/37 AWD', url: 'https://www.cars.com/research/honda-cr-v-2026/' },
  hlPrice: { label: 'PIX11: 2026 Highlander XLE $46,270 gas (24 mpg est.), Hybrid XLE $48,020 (35 mpg EPA)', url: 'https://pix11.com/automotive/2026-toyota-highlander-vehicle-analysis-hybrid-wins/amp/' },
  corolla: { label: 'Carscoops (Aug 2026): 2027 Corolla LE $23,325 plus $1,295 destination', url: 'https://www.carscoops.com/2026/08/2027-toyota-corolla/' },
  corollaMpg: { label: 'fueleconomy.gov: 2027 Corolla 2.0L CVT 35 mpg combined', url: 'https://www.fueleconomy.gov/feg/PowerSearch.do?action=noform&path=1&year1=2027&year2=2027&make=Toyota&baseModel=Corolla&srchtyp=ymm&pageno=1&rowLimit=50' },
  equinoxEv: { label: 'Electrek (Jun 2026): Equinox EV LT FWD $36,495 incl. destination, 319 mi; Ioniq 5 SE RWD $39,100, 318 mi, lease $269 x 24 mo', url: 'https://electrek.co/2026/06/12/chevy-equinox-ev-more-expensive-lease-bolt-cheaper/' },
  boltAssembly: { label: 'GM Authority: 2027 Bolt assembled at GM Fairfax, Kansas City, KS', url: 'https://gmauthority.com/blog/gm/chevrolet/bolt/' },
  boltCut: { label: 'Auto123: Bolt production cut to about 35,000 units, a figure from the UAW local, not GM', url: 'https://www.auto123.com/en/news/amp/2027-chevrolet-bolt-production-cut/74269/' }
};

export const DEFAULT_GLOBALS: Globals = {
  horizonYears: 8,
  milesPerYear: 7500,
  gasPrice: 5.5,
  gasEscalation: 0.02,
  elecPrice: 0.28,
  elecEscalation: 0.03,
  gridKgPerKwh: 0.253,
  gasKgPerGal: 8.887,
  gasUpstreamKgPerGal: 2.86,
  evRealWorldPenalty: 0.1,
  discountRate: 0.05,
  salesTax: 0.1025,
  chargerCost: 1500,
  embodiedMode: 'allocated',
  vehicleLifeYears: 15,
  lxLeakage: 0.5,
  disposal: 'sell',
  tradeInDiscount: 0.15,
  loanInterestDeduction: true,
  marginalTaxRate: 0.22,
  magi: 150000,
  jointFiling: true,
  deductionMonths: 26,
  firstTimeZev: true,
  cc4a: false,
  cc4aEvGrant: 5500,
  cc4aHybridGrant: 5000,
  cc4aCharger: 2000,
  chargerRebate: 0
};

export type ParamKind = 'sourced' | 'assumption';
export interface ParamMeta {
  label: string;
  unit: '$' | '$/gal' | '$/kWh' | '$/mi' | '%' | 'yrs' | 'mi' | 'kg/kWh' | 'kg/gal' | 'x' | 't' | 'mo' | 'mpg' | 'kWh/100mi' | '$/yr' | '$/mo' | '';
  min: number;
  max: number;
  step: number;
  kind: ParamKind;
  /** Percent-style values are stored as fractions but edited as percentages. */
  pct?: boolean;
  /** Yes/No switch (stored as a boolean). */
  bool?: boolean;
  src?: string[];
  note?: string;
}

export const GLOBAL_META: Record<string, ParamMeta> = {
  horizonYears: { label: 'Decision horizon', unit: 'yrs', min: 1, max: 15, step: 1, kind: 'assumption', note: 'How long you expect to hold the decision. Leases chain in 36-month cycles; a partial final cycle is prorated.' },
  milesPerYear: { label: 'Miles per year', unit: 'mi', min: 1000, max: 25000, step: 500, kind: 'assumption', note: 'Low default for a work-from-home household. EPA assumes 11,500 for the average vehicle. This is the biggest swing factor: low miles weakens every fuel-savings argument.' },
  gasPrice: { label: 'Gasoline price', unit: '$/gal', min: 2, max: 10, step: 0.1, kind: 'sourced', src: ['caGas', 'caGasAvg'], note: 'Set between the 2026 year-to-date average ($5.27) and the Sept-Oct spike (~$6.19). Highly volatile: it was $3.98 in January.' },
  gasEscalation: { label: 'Gas price growth / yr', unit: '%', pct: true, min: 0, max: 0.1, step: 0.005, kind: 'assumption' },
  elecPrice: { label: 'Home charging price', unit: '$/kWh', min: 0.1, max: 0.7, step: 0.01, kind: 'sourced', src: ['pgeEv', 'pgeCost', 'pgeUtil'], note: 'Sources disagree on PG&E EV2-A off-peak (23c to 31c). 28c assumes mostly off-peak charging. Your plan and community-choice provider may differ.' },
  elecEscalation: { label: 'Electricity price growth / yr', unit: '%', pct: true, min: 0, max: 0.1, step: 0.005, kind: 'assumption', note: 'PG&E rates have risen faster than inflation; 3% is an assumption.' },
  gridKgPerKwh: { label: 'Grid emissions', unit: 'kg/kWh', min: 0.05, max: 0.9, step: 0.01, kind: 'sourced', src: ['egrid'], note: 'eGRID2021 California: 533.6 lb CO2e/MWh = 0.242 kg/kWh, divided by (1 - 4.4% grid loss) = 0.253. The grid has likely gotten cleaner since 2021, which would favor EVs.' },
  gasKgPerGal: { label: 'Gasoline CO2 (tailpipe)', unit: 'kg/gal', min: 8, max: 10, step: 0.001, kind: 'sourced', src: ['epaGas'], note: 'Burning one gallon. Upstream drilling, refining and delivery is the next line.' },
  gasUpstreamKgPerGal: { label: 'Gasoline upstream (well-to-tank)', unit: 'kg/gal', min: 0, max: 5, step: 0.05, kind: 'sourced', src: ['gasUp', 'gasUp2'], note: 'Extraction, refining and delivery. Published estimates run from ~1.4 to ~2.9 kg per gallon; the high-end GLEC factor is used. Set to 0 to ignore. Applies to gas cars and hybrids; electricity upstream is not modeled.' },
  evRealWorldPenalty: { label: 'EV real-world energy penalty', unit: '%', pct: true, min: 0, max: 0.4, step: 0.01, kind: 'assumption', note: 'Real-world use is often above EPA labels (highway, cold weather, charging losses).' },
  discountRate: { label: 'Discount rate', unit: '%', pct: true, min: 0, max: 0.15, step: 0.005, kind: 'assumption', note: 'What money earns elsewhere. Used to compute present-value (NPV) cost.' },
  salesTax: { label: 'Sales tax', unit: '%', pct: true, min: 0, max: 0.13, step: 0.0025, kind: 'assumption', note: 'Rough Oakland-area combined rate; verify. Applied to purchase price and to lease payments.' },
  chargerCost: { label: 'Home charger install', unit: '$', min: 0, max: 6000, step: 100, kind: 'assumption', src: ['charger'], note: 'Estimate; get an electrician quote. The federal 30C charger credit ended June 30, 2026.' },
  vehicleLifeYears: { label: 'Expected vehicle life', unit: 'yrs', min: 8, max: 25, step: 1, kind: 'assumption', note: 'Used to share manufacturing emissions across everyone who will use the car.' },
  loanInterestDeduction: { label: 'Claim the federal car-loan interest deduction', unit: '', min: 0, max: 1, step: 1, kind: 'assumption', bool: true, src: ['irs', 'irsYears'], note: 'Applies only to loans (not leases) on new vehicles with U.S. final assembly, for interest paid in tax years 2025-2028, up to $10,000 per year. Needs your confirmation.' },
  jointFiling: { label: 'Filing jointly', unit: '', min: 0, max: 1, step: 1, kind: 'assumption', bool: true, src: ['irsPhase'], note: 'Joint filers start losing the deduction at $200,000 of income; others at $100,000.' },
  magi: { label: 'Household income (MAGI) for the phase-out', unit: '$', min: 0, max: 600000, step: 5000, kind: 'assumption', src: ['irsPhase', 'irs'], note: 'Placeholder value, not your income: enter your own modified AGI. The deduction shrinks $200 for every $1,000 over the threshold and is gone $50,000 above it.' },
  marginalTaxRate: { label: 'Marginal federal tax rate', unit: '%', pct: true, min: 0, max: 0.4, step: 0.01, kind: 'assumption', note: 'Converts deductible interest into tax saved. 22% is a placeholder; California does not allow this deduction, so only federal tax counts.' },
  deductionMonths: { label: 'Months of loan interest that qualify', unit: 'mo', min: 0, max: 60, step: 1, kind: 'sourced', src: ['irsYears'], note: 'The deduction covers tax years 2025-2028. A purchase in Nov 2026 gets 26 months of interest (Nov 2026 through Dec 2028). Savings are credited at the end of each 12-month block for simplicity.' },
  firstTimeZev: { label: 'First-time EV buyer/lessee (CA MyFirstEV)', unit: '', min: 0, max: 1, step: 1, kind: 'assumption', bool: true, src: ['mfe', 'mfeSlides', 'mfeGuide'], note: 'Eligible if no one in the purchase has ever been on a ZEV registration or title. No income limit; first-come funding; each automaker can run out. Needs your confirmation.' },
  cc4a: { label: 'Use Clean Cars 4 All: scrap your current car for a grant', unit: '', min: 0, max: 1, step: 1, kind: 'assumption', bool: true, src: ['cc4a', 'cc4aFlyer', 'mfeGuide'], note: 'Income-qualified (Air District flyer says 400% of the federal poverty level; another summary says 300%), Bay Area zip code, car must be old enough (2005 or 2007 and older) and is scrapped, not sold. Off by default; check eligibility before relying on it. When on, your current car earns no sale or trade-in proceeds and no emissions continue.' },
  cc4aEvGrant: { label: 'Clean Cars 4 All grant (EV)', unit: '$', min: 0, max: 12000, step: 500, kind: 'sourced', src: ['cc4aFlyer', 'mfeGuide'], note: 'The Air District lists $5,500-$9,500 for battery-electric depending on income; the low end is used.' },
  cc4aHybridGrant: { label: 'Clean Cars 4 All grant (hybrid)', unit: '$', min: 0, max: 12000, step: 500, kind: 'sourced', src: ['cc4aFlyer'], note: 'The Air District lists $5,000-$7,000 for hybrids; the low end is used. Gas-only replacements get nothing.' },
  cc4aCharger: { label: 'Clean Cars 4 All charger funding', unit: '$', min: 0, max: 4000, step: 250, kind: 'sourced', src: ['cc4a', 'cc4aFlyer'], note: 'Up to $2,000 for home charging when you buy an EV; it only reduces the charger cost.' },
  chargerRebate: { label: 'Utility or community-choice charger rebate', unit: '$', min: 0, max: 3000, step: 100, kind: 'assumption', note: 'None confirmed for Oakland in my research. Check the East Bay Community Energy incentive finder (incentives.ebce.org) and PG&E before relying on one.' },
  tradeInDiscount: { label: 'Trade-in offer below private-sale value', unit: '%', pct: true, min: 0, max: 0.5, step: 0.01, kind: 'assumption', src: ['caTradeIn'], note: 'Placeholder, not a quote: dealers usually offer less than a private buyer would pay, in exchange for convenience. Replace it with a real trade-in offer. California gives no sales-tax credit for a trade-in, so this value is the only difference from selling privately.' },
  lxLeakage: { label: 'Sold-car emissions that continue', unit: '%', pct: true, min: 0, max: 1, step: 0.05, kind: 'assumption', note: 'If you sell or trade in your current car it stays on the road. 50% assumes the next owner drives it about half as far as you would have, or displaces some other purchase. At 100% the sale saves nothing from the old car itself.' }
};

/** Placeholder; real per-vehicle metadata is built below from the catalog. */
export const VEHICLE_META: Record<string, Record<string, ParamMeta>> = {};

export const DEFAULT_CRITERIA: Criterion[] = [
  { id: 'safety', label: 'Crash safety', weight: 25, objective: true },
  { id: 'airq', label: 'Local air quality (tailpipe)', weight: 20, objective: true },
  { id: 'supply', label: 'Battery / fuel supply-chain ethics', weight: 20, objective: false },
  { id: 'community', label: 'Local jobs & community', weight: 15, objective: false },
  { id: 'labor', label: 'Manufacturer labor practices', weight: 10, objective: false },
  { id: 'fit', label: 'Household fit & accessibility', weight: 10, objective: false }
];

export const CRITERIA_NOTES: Record<string, { help: string; src?: string[] }> = {
  safety: { help: 'IIHS/NHTSA results. Unrated models default to a neutral 3.', src: ['myIihs', 'lxEdmunds', 'lxCr'] },
  airq: { help: 'Zero tailpipe NOx and particulates for EVs matters for a dense, highway-adjacent neighborhood.' },
  supply: { help: 'Rated from Amnesty 2024 supply-chain scores where available. The Lexus is rated higher because keeping it creates no new mineral demand.', src: ['amnesty'] },
  community: { help: 'Built in your region and rebuilding a closed plant rate highest.', src: ['fremont', 'r2Plant'] },
  labor: { help: 'Low confidence: based on documented union disputes only. Adjust to your own values.', src: ['teslaUnion', 'r2Union'] },
  fit: { help: 'Seats, cargo and towing for your household. The LX 470 seats up to 8.' }
};

/* ------------------------------ vehicle catalog ------------------------------ */

export type VehicleGroup = 'owned' | 'ev' | 'hybrid' | 'gas' | 'custom';

export interface VehicleDef {
  group: VehicleGroup;
  vehicle: Vehicle;
  meta: Record<string, ParamMeta>;
  ratingNotes: Record<string, string>;
}

const BASE: Record<string, ParamMeta> = {
  price: { label: 'Price', unit: '$', min: 1000, max: 150000, step: 250, kind: 'assumption' },
  mpg: { label: 'Fuel economy', unit: 'mpg', min: 8, max: 80, step: 0.5, kind: 'assumption' },
  kwhPer100mi: { label: 'Energy use (EPA-style)', unit: 'kWh/100mi', min: 15, max: 60, step: 0.5, kind: 'assumption' },
  realWorldAdj: { label: 'Real-world adjustment vs label', unit: 'x', min: 0.8, max: 1.5, step: 0.01, kind: 'assumption' },
  maintPerMile: { label: 'Maintenance & repair', unit: '$/mi', min: 0.03, max: 0.5, step: 0.005, kind: 'assumption' },
  insurancePerYear: { label: 'Insurance', unit: '$/yr', min: 300, max: 8000, step: 50, kind: 'assumption' },
  embodiedT: { label: 'Manufacturing emissions', unit: 't', min: 2, max: 30, step: 0.5, kind: 'assumption' },
  depreciation5yr: { label: '5-year value loss', unit: '%', min: 0.1, max: 0.85, step: 0.01, kind: 'assumption', pct: true },
  annualValueLoss: { label: 'Value loss / yr', unit: '%', min: 0, max: 0.2, step: 0.005, kind: 'assumption', pct: true },
  apr: { label: 'Loan APR', unit: '%', min: 0, max: 0.2, step: 0.0025, kind: 'sourced', src: ['apr', 'aprExp'], pct: true, note: 'Average new-car APR is 6.35-7.0%. Your credit and any promo APR will differ.' },
  termMonths: { label: 'Loan term', unit: 'mo', min: 24, max: 84, step: 12, kind: 'assumption' },
  down: { label: 'Down payment', unit: '$', min: 0, max: 60000, step: 500, kind: 'assumption' },
  monthly: { label: 'Lease payment', unit: '$/mo', min: 100, max: 1800, step: 5, kind: 'sourced' },
  dueAtSigning: { label: 'Lease due at signing', unit: '$', min: 0, max: 15000, step: 50, kind: 'sourced' },
  leaseTerm: { label: 'Lease term', unit: 'mo', min: 24, max: 48, step: 12, kind: 'sourced' },
  usAssembled: { label: 'Final assembly in the U.S.', unit: '', min: 0, max: 1, step: 1, kind: 'assumption', bool: true, src: ['irs'], note: 'Needed for the car-loan interest deduction. Left at No unless a source confirms U.S. assembly; check the VIN at nhtsa.gov/vin-decoder.' },
  zevRebate: { label: 'CA MyFirstEV rebate available', unit: '$', min: 0, max: 3500, step: 250, kind: 'sourced', src: ['mfe', 'mfeSlides'], note: '$3,500 for first-time ZEV buyers or lessees on new battery-electric models; $0 if the automaker is not participating or its funding has closed.' }
};

function buildMeta(v: Vehicle, over: Record<string, Partial<ParamMeta>>): Record<string, ParamMeta> {
  const keys: string[] = ['price', 'maintPerMile', 'insurancePerYear'];
  if (v.kind === 'ev') keys.push('kwhPer100mi', 'realWorldAdj');
  else keys.push('mpg');
  if (v.owned) keys.push('annualValueLoss');
  else keys.push('embodiedT', 'depreciation5yr', 'apr', 'termMonths', 'down', 'monthly', 'dueAtSigning', 'leaseTerm', 'usAssembled');
  if (v.kind === 'ev' && !v.owned) keys.push('zevRebate');
  const out: Record<string, ParamMeta> = {};
  for (const k of keys) out[k] = { ...BASE[k], ...(over[k] ?? {}) };
  if (v.owned) out.price = { ...out.price, label: 'Sale value today' };
  else out.price = { ...out.price, label: 'Price incl. destination' };
  return out;
}

const loanFor = (price: number): { apr: number; termMonths: number; down: number } => ({ apr: 0.07, termMonths: 60, down: Math.round((price * 0.1) / 500) * 500 });
const EST_INS = 'Estimate scaled to vehicle value; AAA average full coverage is $1,694/yr. Get quotes.';

const neutral = { safety: 3, airq: 2, supply: 3, community: 3, labor: 3, fit: 3 };

function def(group: VehicleGroup, vehicle: Vehicle, over: Record<string, Partial<ParamMeta>>, ratingNotes: Record<string, string> = {}): VehicleDef {
  return { group, vehicle, meta: buildMeta(vehicle, over), ratingNotes };
}

export const CATALOG: VehicleDef[] = [
  def('owned', {
    id: 'lx', name: '1999 Lexus LX 470', short: 'Lexus LX 470', kind: 'ice', owned: true,
    price: 7000, mpg: 13, kwhPer100mi: 0, realWorldAdj: 1, maintPerMile: 0.18, insurancePerYear: 1100,
    embodiedT: 0, depreciation5yr: 0, annualValueLoss: 0.024, materials: 4,
    ratings: { safety: 2, airq: 2, supply: 4, community: 2, labor: 3, fit: 5 }
  }, {
    price: { kind: 'sourced', src: ['lxKbb', 'lxEdmunds'], note: 'KBB private-party resale $6,713 (date of that valuation unclear); Edmunds estimates $3.5-5.7k, though 4 current listings average $11.2k. Replace with your own comp or an offer.' },
    mpg: { kind: 'sourced', src: ['lxMpg'] },
    maintPerMile: { src: ['aaa'], note: 'AAA 2025 medium-SUV 4WD average is 11.8c/mi; raised to 18c for a 27-year-old vehicle. Use your real repair history.' },
    insurancePerYear: { src: ['aaaIns'], note: 'Older low-value vehicles usually cost less than the AAA $1,694 average. Use your actual premium.' },
    annualValueLoss: { kind: 'sourced', src: ['lxKbb'], note: 'KBB: 7% over 3 years = ~2.4%/yr.' }
  }, {
    safety: '1999 model: no stability control (added 2000), roof strength not tested.',
    airq: '27-year-old gasoline V8.',
    supply: 'No new mineral or manufacturing demand from keeping it.',
    community: 'Built in Japan; keeping it supports only local repair shops.',
    labor: 'Neutral.',
    fit: 'Seats up to 8, 6,500 lb towing.'
  }),

  def('ev', {
    id: 'tesla', name: 'Tesla Model Y Standard RWD', short: 'Tesla Model Y', kind: 'ev', owned: false,
    price: 41630, mpg: 0, kwhPer100mi: 28, realWorldAdj: 1, maintPerMile: 0.1007, insurancePerYear: 2300,
    embodiedT: 9, depreciation5yr: 0.58, annualValueLoss: 0, usAssembled: true, zevRebate: 0,
    loan: loanFor(41630), lease: { monthly: 499, dueAtSigning: 4195, termMonths: 36 }, materials: 3,
    ratings: { safety: 5, airq: 5, supply: 3, community: 5, labor: 2, fit: 4 }
  }, {
    price: { kind: 'sourced', src: ['myPrice'] },
    kwhPer100mi: { src: ['myEff'], note: 'About 4 mi/kWh at the battery; ~28 kWh/100 mi at the wall assumes ~12% charging losses.' },
    maintPerMile: { kind: 'sourced', src: ['aaa'], note: 'AAA 2025 electric-vehicle average: 10.07c/mi.' },
    insurancePerYear: { src: ['aaaIns'], note: EST_INS },
    embodiedT: { kind: 'sourced', src: ['lcaAutocar', 'lcaLowcvp', 'lcaIrish'], note: 'Cited estimates for a medium EV are ~8.8-10 t; studies of batteries alone range 8-20 t.' },
    depreciation5yr: { kind: 'sourced', src: ['myDep', 'evDep'], note: 'Cited figures are 57.8-61%; 58% used.' },
    monthly: { src: ['myLease'], note: 'Advertised before tax and fees; offers change often.' },
    dueAtSigning: { src: ['myLeaseDas'], note: 'An earlier $459 offer had $4,155 due; the payment later rose $40, so ~$4,195 assumed.' },
    leaseTerm: { src: ['myLeaseDas'] },
    usAssembled: { kind: 'sourced', src: ['fremont', 'irs'], note: 'Built in Fremont, CA (Model Y is also built in Texas).' },
    zevRebate: { note: 'Tesla funding for MyFirstEV is closed per CARB (Aug 27, 2026), so $0 is assumed. If funding reopens, enter $3,500.', src: ['mfeSlides', 'mfe'] }
  }, {
    safety: 'IIHS Top Safety Pick+ (2026-27).',
    supply: 'Amnesty 2024: 49/90, second of 13 automakers ranked, but "not adequate".',
    community: 'Built in Fremont, CA.',
    labor: 'Documented UAW dispute at Fremont.',
    fit: '5 seats.'
  }),

  def('ev', {
    id: 'rivian', name: 'Rivian R2 Performance (launch)', short: 'Rivian R2', kind: 'ev', owned: false,
    price: 57990, mpg: 0, kwhPer100mi: 32, realWorldAdj: 1.15, maintPerMile: 0.1007, insurancePerYear: 2800,
    embodiedT: 10.5, depreciation5yr: 0.572, annualValueLoss: 0, usAssembled: true, zevRebate: 3500,
    loan: loanFor(57990), lease: { monthly: 829, dueAtSigning: 5724, termMonths: 36 }, materials: 3,
    ratings: { safety: 3, airq: 5, supply: 3, community: 4, labor: 3, fit: 4 }
  }, {
    price: { kind: 'sourced', src: ['r2Price'], note: 'Launch Performance trim. Cheaper $53,990 and $48,490 trims arrive late 2026 and 2027.' },
    kwhPer100mi: { kind: 'sourced', src: ['r2Eff'], note: 'EPA label for R2 Performance. In a back-to-back test it used 18-26% more than the Model Y despite equal labels (see adjustment below).' },
    realWorldAdj: { kind: 'sourced', src: ['r2Real'], note: '1.15 splits the difference of the 18-26% gap in the one independent test found.' },
    maintPerMile: { kind: 'sourced', src: ['aaa'], note: 'AAA EV average; a new brand may cost more to service.' },
    insurancePerYear: { src: ['aaaIns'], note: EST_INS },
    embodiedT: { src: ['lcaAutocar', 'lcaTc'], note: 'Scaled up from the ~9 t medium-EV figure for the larger (~88 kWh) battery and heavier body. My estimate, not a published number.' },
    depreciation5yr: { src: ['evDep'], note: 'No resale history for the R2 yet; EV average 57.2% used.' },
    monthly: { src: ['r2Lease'], note: 'Reported as backlash-inducing; Rivian is not subsidizing R2 leases at launch.' },
    dueAtSigning: { src: ['r2Lease'] },
    leaseTerm: { src: ['r2Lease'] },
    usAssembled: { kind: 'sourced', src: ['r2Plant', 'irs'], note: 'Built in Normal, Illinois.' },
    zevRebate: { note: 'Rivian is exempt from the $50,000 price cap as a California-headquartered ZEV maker and is listed as a participating automaker.', src: ['mfeSlides', 'mfeCap'] }
  }, {
    safety: 'No IIHS result found; neutral 3.',
    supply: 'Not in the Amnesty ranking; neutral 3.',
    community: 'Built in Normal, IL on a reopened plant.',
    labor: 'Non-union plant; no major dispute found.',
    fit: '5 seats, larger cargo.'
  }),

  def('ev', {
    id: 'bolt', name: 'Chevrolet Bolt LT (2027)', short: 'Chevy Bolt', kind: 'ev', owned: false,
    price: 28995, mpg: 0, kwhPer100mi: 28, realWorldAdj: 1, maintPerMile: 0.1007, insurancePerYear: 1900,
    embodiedT: 7.5, depreciation5yr: 0.6, annualValueLoss: 0, usAssembled: true, zevRebate: 3500,
    loan: loanFor(28995), lease: { monthly: 477, dueAtSigning: 2977, termMonths: 36 }, materials: 3,
    ratings: { safety: 3, airq: 5, supply: 2, community: 3, labor: 3, fit: 3 }
  }, {
    price: { kind: 'sourced', src: ['boltLease'], note: 'LT trim; dealers may discount.' },
    kwhPer100mi: { kind: 'sourced', src: ['boltEpa'], note: 'EPA rating for the 2027 Bolt: 120 MPGe, 28 kWh/100 mi.' },
    maintPerMile: { kind: 'sourced', src: ['aaa'] },
    insurancePerYear: { src: ['aaaIns'], note: EST_INS },
    embodiedT: { src: ['lcaAutocar', 'lcaTc'], note: 'Scaled down from ~9 t for the smaller 65 kWh battery. My estimate.' },
    depreciation5yr: { src: ['evDep'], note: 'Cheap EVs depreciate faster (Nissan Leaf 63%); 60% assumed. GM is ending Bolt production, which could push this higher.' },
    apr: { note: 'One dealer listing advertised 0.9% for 36 months for well-qualified GM Financial buyers; try that here.' },
    monthly: { src: ['boltLease'], note: 'Dated offer: advertised through Nov 4, 2026, as a national figure, not a California one. Check current terms with a dealer.' },
    dueAtSigning: { src: ['boltLease'] },
    leaseTerm: { src: ['boltLease'] },
    usAssembled: { kind: 'sourced', src: ['boltAssembly', 'irs'], note: 'Built at GM Fairfax, Kansas City, Kansas.' },
    zevRebate: { note: 'GM/Chevrolet is a participating automaker; the new-EV MSRP must be $50,000 or less (the Bolt is). Confirm with the dealer that Chevrolet funding is live.', src: ['mfeSlides', 'mfeGuide'] }
  }, {
    safety: 'No IIHS result found; neutral 3.',
    supply: 'GM scored 32/90 in Amnesty 2024.',
    community: 'Built by GM at Fairfax, Kansas City, KS.',
    labor: 'Neutral; not researched.',
    fit: 'Smaller 5-seat hatch. GM calls the 2027 Bolt a limited run of about 18 months; the ~35,000-unit figure comes from the UAW local, not GM. Parts and resale are uncertain.'
  }),

  def('ev', {
    id: 'equinoxev', name: 'Chevrolet Equinox EV LT (FWD)', short: 'Chevy Equinox EV', kind: 'ev', owned: false,
    price: 36495, mpg: 0, kwhPer100mi: 30, realWorldAdj: 1, maintPerMile: 0.1007, insurancePerYear: 2000,
    embodiedT: 9.5, depreciation5yr: 0.572, annualValueLoss: 0, usAssembled: false, zevRebate: 3500,
    loan: loanFor(36495), materials: 3, ratings: { ...neutral, airq: 5, supply: 2, fit: 4 }
  }, {
    price: { kind: 'sourced', src: ['equinoxEv'] },
    kwhPer100mi: { note: 'EPA label not found in my research; 30 kWh/100 mi is an estimate for a ~85 kWh car with 319 mi range.' },
    embodiedT: { src: ['lcaAutocar', 'lcaTc'], note: 'Scaled up from ~9 t for a larger battery. My estimate.' },
    depreciation5yr: { src: ['evDep'], note: 'EV average 57.2%.' },
    usAssembled: { note: 'Not verified in my research, so set to No. Check the VIN before assuming the deduction.' },
    zevRebate: { note: 'GM/Chevrolet is participating and the MSRP is under the $50,000 cap. Confirm funding is live.', src: ['mfeSlides', 'mfeGuide'] }
  }, { safety: 'No IIHS result found; neutral 3.', supply: 'GM scored 32/90 in Amnesty 2024.', community: 'Assembly location not verified.', fit: '5 seats, ~57 cu ft cargo.' }),

  def('ev', {
    id: 'ioniq5', name: 'Hyundai Ioniq 5 SE RWD', short: 'Hyundai Ioniq 5', kind: 'ev', owned: false,
    price: 39100, mpg: 0, kwhPer100mi: 27, realWorldAdj: 1, maintPerMile: 0.1007, insurancePerYear: 2100,
    embodiedT: 9, depreciation5yr: 0.572, annualValueLoss: 0, usAssembled: false, zevRebate: 3500,
    loan: loanFor(39100), lease: { monthly: 269, dueAtSigning: 3999, termMonths: 24 }, materials: 3,
    ratings: { ...neutral, airq: 5, supply: 1, fit: 4 }
  }, {
    price: { kind: 'sourced', src: ['equinoxEv'], note: 'June 2026 starting price including destination.' },
    kwhPer100mi: { note: 'EPA label not found in my research; 27 kWh/100 mi is an estimate for a ~77 kWh car with 318 mi range.' },
    depreciation5yr: { src: ['evDep'], note: 'EV average 57.2%.' },
    monthly: { src: ['equinoxEv'], note: 'June 2026 offer ($7,000 Hyundai discount, 24 months); it may have expired. Check current offers.' },
    dueAtSigning: { src: ['equinoxEv'] },
    leaseTerm: { src: ['equinoxEv'] },
    usAssembled: { note: 'Not verified in my research, so set to No. Check the VIN before assuming the deduction.' },
    zevRebate: { note: 'Hyundai was in the first wave of MyFirstEV automakers (launch Aug 7, 2026); the MSRP is under the $50,000 cap.', src: ['mfe', 'mfeSlides'] }
  }, { safety: 'No IIHS result found; neutral 3.', supply: 'Hyundai scored 21/90 in Amnesty 2024.', community: 'Assembly location not verified.', fit: '5 seats.' }),

  def('hybrid', {
    id: 'rav4h', name: 'Toyota RAV4 Hybrid LE (FWD)', short: 'Toyota RAV4 Hybrid', kind: 'hybrid', owned: false,
    price: 33350, mpg: 43, kwhPer100mi: 0, realWorldAdj: 1, maintPerMile: 0.0975, insurancePerYear: 1800,
    embodiedT: 6.5, depreciation5yr: 0.354, annualValueLoss: 0, usAssembled: false,
    loan: loanFor(33350), lease: { monthly: 299, dueAtSigning: 3999, termMonths: 36 }, materials: 3,
    ratings: { ...neutral, airq: 3, fit: 4 }
  }, {
    price: { kind: 'sourced', src: ['rav4Price'] },
    mpg: { kind: 'sourced', src: ['rav4Mpg'], note: 'EPA 47 city / 40 hwy / 43 combined for LE FWD (AWD is 42).' },
    maintPerMile: { kind: 'sourced', src: ['aaa'], note: 'AAA 2025 hybrid average: 9.75c/mi.' },
    insurancePerYear: { src: ['aaaIns'], note: EST_INS },
    embodiedT: { kind: 'sourced', src: ['lcaLowcvp'], note: 'LowCVP/Ricardo: hybrid production ~6.5 t CO2e.' },
    depreciation5yr: { kind: 'sourced', src: ['hybDep'], note: 'Hybrids average 35.4% over 5 years.' },
    monthly: { src: ['rav4Lease'], note: 'Southern California offer; Bay Area offers may differ.' },
    dueAtSigning: { src: ['rav4Lease'] },
    leaseTerm: { src: ['rav4Lease'] },
    usAssembled: { note: 'Not verified in my research, so set to No. Check the VIN before assuming the deduction.' }
  }, { safety: 'No IIHS result found in my research; neutral 3.', airq: 'Gasoline engine, but about a third of the fuel burned.', community: 'Assembly location not verified.', fit: '5 seats, 37.8 cu ft cargo.' }),

  def('hybrid', {
    id: 'camryh', name: 'Toyota Camry Hybrid LE', short: 'Toyota Camry Hybrid', kind: 'hybrid', owned: false,
    price: 30495, mpg: 51, kwhPer100mi: 0, realWorldAdj: 1, maintPerMile: 0.0975, insurancePerYear: 1700,
    embodiedT: 6.5, depreciation5yr: 0.354, annualValueLoss: 0, usAssembled: false,
    loan: loanFor(30495), lease: { monthly: 345, dueAtSigning: 2000, termMonths: 36 }, materials: 3,
    ratings: { ...neutral, safety: 4, airq: 3, fit: 3 }
  }, {
    price: { kind: 'sourced', src: ['camryPrice', 'camryDest', 'camry2027'], note: '2026 model: $29,300 MSRP plus $1,195 destination. The 2027 LE ($29,700 before destination) is arriving this fall.' },
    mpg: { kind: 'sourced', src: ['camryMpg'], note: 'EPA 51 mpg combined for the 2026 LE FWD.' },
    maintPerMile: { kind: 'sourced', src: ['aaa'], note: 'AAA 2025 hybrid average: 9.75c/mi.' },
    insurancePerYear: { src: ['aaaIns'], note: EST_INS },
    embodiedT: { kind: 'sourced', src: ['lcaLowcvp'], note: 'LowCVP/Ricardo: hybrid production ~6.5 t CO2e.' },
    depreciation5yr: { kind: 'sourced', src: ['hybDep'], note: 'Hybrids average 35.4% over 5 years.' },
    monthly: { src: ['hybLease'], note: 'May 2026 national offer listing; check current offers.' },
    dueAtSigning: { src: ['hybLease'] },
    leaseTerm: { src: ['hybLease'] },
    usAssembled: { note: 'Not verified in my research, so set to No. Check the VIN before assuming the deduction.' }
  }, { safety: 'A low-authority source reports IIHS Top Safety Pick+; confirm at iihs.org.', airq: 'Gasoline engine, but roughly a quarter of the fuel burned.', community: 'Assembly location not verified.', fit: '5-seat sedan.' }),

  def('hybrid', {
    id: 'crvh', name: 'Honda CR-V Sport Hybrid AWD', short: 'Honda CR-V Hybrid', kind: 'hybrid', owned: false,
    price: 38580, mpg: 37, kwhPer100mi: 0, realWorldAdj: 1, maintPerMile: 0.0975, insurancePerYear: 1900,
    embodiedT: 6.5, depreciation5yr: 0.354, annualValueLoss: 0, usAssembled: false,
    loan: loanFor(38580), lease: { monthly: 372, dueAtSigning: 2000, termMonths: 36 }, materials: 3,
    ratings: { ...neutral, airq: 3, fit: 4 }
  }, {
    price: { kind: 'sourced', src: ['crvHyb'], note: 'MSRP; destination may not be included.' },
    mpg: { kind: 'sourced', src: ['crvMpg'], note: 'AWD 40/34/37. The FWD hybrid is rated 40 combined.' },
    maintPerMile: { kind: 'sourced', src: ['aaa'], note: 'AAA 2025 hybrid average: 9.75c/mi.' },
    insurancePerYear: { src: ['aaaIns'], note: EST_INS },
    embodiedT: { kind: 'sourced', src: ['lcaLowcvp'], note: 'LowCVP/Ricardo: hybrid production ~6.5 t CO2e.' },
    depreciation5yr: { kind: 'sourced', src: ['hybDep'], note: 'Hybrids average 35.4% over 5 years.' },
    monthly: { src: ['hybLease'], note: 'The listing says "CR-V" without a trim; treat as approximate.' },
    dueAtSigning: { src: ['hybLease'] },
    leaseTerm: { src: ['hybLease'] },
    usAssembled: { note: 'Not verified in my research, so set to No. Check the VIN before assuming the deduction.' }
  }, { safety: 'No IIHS result found in my research; neutral 3.', airq: 'Gasoline engine, but about a third less fuel than the gas CR-V.', community: 'Assembly location not verified.', fit: '5 seats.' }),

  def('hybrid', {
    id: 'hlh', name: 'Toyota Highlander Hybrid XLE', short: 'Toyota Highlander Hybrid', kind: 'hybrid', owned: false,
    price: 48020, mpg: 35, kwhPer100mi: 0, realWorldAdj: 1, maintPerMile: 0.0975, insurancePerYear: 2200,
    embodiedT: 8, depreciation5yr: 0.354, annualValueLoss: 0, usAssembled: false,
    loan: loanFor(48020), materials: 3, ratings: { ...neutral, airq: 3, fit: 5 }
  }, {
    price: { kind: 'sourced', src: ['hlPrice'], note: 'Base MSRP; destination not separately verified.' },
    mpg: { kind: 'sourced', src: ['hlPrice'], note: 'EPA 35 city / 35 highway.' },
    maintPerMile: { kind: 'sourced', src: ['aaa'], note: 'AAA 2025 hybrid average: 9.75c/mi.' },
    insurancePerYear: { src: ['aaaIns'], note: EST_INS },
    embodiedT: { src: ['lcaLowcvp'], note: 'Scaled up from the ~6.5 t hybrid figure for a three-row SUV. My estimate.' },
    depreciation5yr: { kind: 'sourced', src: ['hybDep'], note: 'Hybrids average 35.4% over 5 years.' },
    usAssembled: { note: 'Not verified in my research, so set to No. Check the VIN before assuming the deduction.' }
  }, { safety: 'No IIHS result found in my research; neutral 3.', airq: 'Gasoline engine, but about a third less fuel than the gas Highlander.', community: 'Assembly location not verified.', fit: 'Three rows (7-8 seats), standard AWD; closest to the Lexus for seating.' }),

  def('gas', {
    id: 'corolla', name: 'Toyota Corolla LE (gas)', short: 'Toyota Corolla', kind: 'ice', owned: false,
    price: 24620, mpg: 35, kwhPer100mi: 0, realWorldAdj: 1, maintPerMile: 0.1023, insurancePerYear: 1600,
    embodiedT: 6, depreciation5yr: 0.313, annualValueLoss: 0, usAssembled: false,
    loan: loanFor(24620), materials: 3, ratings: { ...neutral, airq: 2, fit: 3 }
  }, {
    price: { kind: 'sourced', src: ['corolla'], note: '2027 model: $23,325 MSRP plus $1,295 destination.' },
    mpg: { kind: 'sourced', src: ['corollaMpg'], note: 'EPA 35 mpg combined (32 city, 41 highway).' },
    maintPerMile: { kind: 'sourced', src: ['aaa'], note: 'AAA 2025 small-sedan average: 10.23c/mi.' },
    insurancePerYear: { src: ['aaaIns'], note: EST_INS },
    embodiedT: { kind: 'sourced', src: ['lcaAutocar', 'lcaLowcvp'], note: 'Petrol car production is ~5.6-6 t CO2e.' },
    depreciation5yr: { kind: 'sourced', src: ['gasDep'], note: 'iSeeCars: Corolla loses 31.3% over 5 years.' },
    usAssembled: { note: 'Not verified in my research, so set to No. Check the VIN before assuming the deduction.' }
  }, { safety: 'No IIHS result found in my research; neutral 3.', airq: 'Gasoline engine.', community: 'Assembly location not verified.', fit: '5-seat compact sedan.' }),

  def('gas', {
    id: 'crvg', name: 'Honda CR-V LX (gas, FWD)', short: 'Honda CR-V (gas)', kind: 'ice', owned: false,
    price: 32315, mpg: 30, kwhPer100mi: 0, realWorldAdj: 1, maintPerMile: 0.1164, insurancePerYear: 1800,
    embodiedT: 6, depreciation5yr: 0.418, annualValueLoss: 0, usAssembled: false,
    loan: loanFor(32315), materials: 3, ratings: { ...neutral, airq: 2, fit: 4 }
  }, {
    price: { kind: 'sourced', src: ['crvGas'], note: 'Includes the $1,395 destination charge.' },
    mpg: { kind: 'sourced', src: ['crvMpg'], note: 'EPA 28/33/30 for FWD (AWD is 29).' },
    maintPerMile: { kind: 'sourced', src: ['aaa'], note: 'AAA 2025 compact-SUV average: 11.64c/mi.' },
    insurancePerYear: { src: ['aaaIns'], note: EST_INS },
    embodiedT: { kind: 'sourced', src: ['lcaAutocar', 'lcaLowcvp'], note: 'Petrol car production is ~5.6-6 t CO2e.' },
    depreciation5yr: { kind: 'sourced', src: ['hybDep'], note: 'All-vehicle 5-year average is 41.8%.' },
    usAssembled: { note: 'Not verified in my research, so set to No. Check the VIN before assuming the deduction.' }
  }, { safety: 'No IIHS result found in my research; neutral 3.', airq: 'Gasoline engine.', community: 'Assembly location not verified.', fit: '5 seats.' }),

  def('gas', {
    id: 'hlg', name: 'Toyota Highlander XLE (gas)', short: 'Toyota Highlander (gas)', kind: 'ice', owned: false,
    price: 46270, mpg: 24, kwhPer100mi: 0, realWorldAdj: 1, maintPerMile: 0.1179, insurancePerYear: 2100,
    embodiedT: 7.5, depreciation5yr: 0.418, annualValueLoss: 0, usAssembled: false,
    loan: loanFor(46270), materials: 3, ratings: { ...neutral, airq: 2, fit: 5 }
  }, {
    price: { kind: 'sourced', src: ['hlPrice'], note: 'Base MSRP; destination not separately verified.' },
    mpg: { kind: 'sourced', src: ['hlPrice'], note: 'Manufacturer estimate of 24 combined, not an EPA figure.' },
    maintPerMile: { kind: 'sourced', src: ['aaa'], note: 'AAA 2025 medium-SUV 4WD average: 11.79c/mi.' },
    insurancePerYear: { src: ['aaaIns'], note: EST_INS },
    embodiedT: { src: ['lcaAutocar'], note: 'Scaled up from ~6 t for a three-row SUV. My estimate.' },
    depreciation5yr: { kind: 'sourced', src: ['hybDep'], note: 'All-vehicle 5-year average is 41.8%.' },
    usAssembled: { note: 'Not verified in my research, so set to No. Check the VIN before assuming the deduction.' }
  }, { safety: 'No IIHS result found in my research; neutral 3.', airq: 'Gasoline engine.', community: 'Assembly location not verified.', fit: 'Three rows, standard AWD, 5,000 lb towing.' })
];

export const DEFAULT_VEHICLES: Vehicle[] = CATALOG.map((d) => d.vehicle);
for (const d of CATALOG) VEHICLE_META[d.vehicle.id] = d.meta;
export const RATING_NOTES: Record<string, Record<string, string>> = Object.fromEntries(CATALOG.map((d) => [d.vehicle.id, d.ratingNotes]));
export const DEFAULT_SELECTED: string[] = ['tesla', 'rivian', 'bolt'];
export const DEFAULT_OPTIONS: OptionSpec[] = optionsFor(DEFAULT_VEHICLES, DEFAULT_SELECTED);


export const LIMITATIONS: string[] = [
  'Upstream emissions for electricity (fuel supply for power plants) are not modeled; only gasoline upstream is.',
  'The federal EV and charger credits have ended; PG&E Clean Fuel Reward is currently $0 and its used-EV rebate does not apply to new cars.',
  'MyFirstEV is first-come, automaker-matched money that can run out; Tesla funding is already closed. Confirm with the dealer in writing.',
  'Clean Cars 4 All needs income, zip code and old-car eligibility, and is off by default.',
  'Loan-interest deduction: savings are credited at the end of each 12-month block; cap and phase-out are simplified; California conforms to none of it.',
  'Resale values are projections. The Rivian R2 and 2027 Bolt have no resale history, and GM is ending the Bolt.',
  'Insurance, registration fees, battery degradation, and tolls or HOV benefits are rough or omitted.',
  'Repeated 36-month leases assume the same terms each cycle; real offers change.',
  'People-pillar ratings are partly subjective. Adjust them in the People tab.'
];

/** A blank starting point for a car the user adds. */
export function makeCustomVehicle(kind: 'ice' | 'hybrid' | 'ev', n: number): VehicleDef {
  const base =
    kind === 'ev'
      ? { price: 40000, mpg: 0, kwh: 30, maint: 0.1007, ins: 2100, emb: 9, dep: 0.572 }
      : kind === 'hybrid'
        ? { price: 33000, mpg: 45, kwh: 0, maint: 0.0975, ins: 1800, emb: 6.5, dep: 0.354 }
        : { price: 30000, mpg: 30, kwh: 0, maint: 0.11, ins: 1700, emb: 6, dep: 0.418 };
  const label = kind === 'ev' ? 'EV' : kind === 'hybrid' ? 'hybrid' : 'gas car';
  const v: Vehicle = {
    id: `custom${n}`,
    name: `My ${label} ${n}`,
    short: `My ${label} ${n}`,
    kind,
    owned: false,
    price: base.price,
    mpg: base.mpg,
    kwhPer100mi: base.kwh,
    realWorldAdj: 1,
    maintPerMile: base.maint,
    insurancePerYear: base.ins,
    embodiedT: base.emb,
    depreciation5yr: base.dep,
    annualValueLoss: 0,
    usAssembled: false,
    zevRebate: 0,
    loan: loanFor(base.price),
    materials: 3,
    ratings: { safety: 3, airq: kind === 'ev' ? 5 : kind === 'hybrid' ? 3 : 2, supply: 3, community: 3, labor: 3, fit: 3 }
  };
  const note = 'Starting value from the catalog averages; replace it with the real number from your quote.';
  return def('custom' as VehicleGroup, v, { price: { note }, mpg: { note }, kwhPer100mi: { note }, maintPerMile: { note: 'AAA 2025 class average; adjust.', src: ['aaa'] }, insurancePerYear: { note: 'Get a quote.' } });
}

/** A starting point for "the car you have now". Everything in a preset is editable. */
export interface CarPreset {
  id: string;
  label: string;
  blurb: string;
  vehicle: Pick<Vehicle, 'name' | 'short' | 'kind' | 'price' | 'mpg' | 'maintPerMile' | 'insurancePerYear' | 'annualValueLoss' | 'materials' | 'ratings'>;
}

const GENERIC_NOTE = 'Placeholder for a typical car of this kind, not your car. Replace it with your own number.';

export const CAR_PRESETS: CarPreset[] = [
  { id: 'lexus', label: 'Lexus LX 470 (example)', blurb: '1999 gas SUV, the original test case', vehicle: { name: '1999 Lexus LX 470', short: 'Lexus LX 470', kind: 'ice', price: 7000, mpg: 13, maintPerMile: 0.18, insurancePerYear: 1100, annualValueLoss: 0.024, materials: 4, ratings: { safety: 2, airq: 2, supply: 4, community: 2, labor: 3, fit: 5 } } },
  { id: 'sedan', label: 'Older gas sedan', blurb: 'Placeholder values', vehicle: { name: 'My gas sedan', short: 'My gas sedan', kind: 'ice', price: 9000, mpg: 28, maintPerMile: 0.09, insurancePerYear: 1400, annualValueLoss: 0.08, materials: 4, ratings: { safety: 3, airq: 2, supply: 4, community: 3, labor: 3, fit: 3 } } },
  { id: 'suv', label: 'Older gas SUV', blurb: 'Placeholder values', vehicle: { name: 'My gas SUV', short: 'My gas SUV', kind: 'ice', price: 11000, mpg: 21, maintPerMile: 0.11, insurancePerYear: 1500, annualValueLoss: 0.08, materials: 4, ratings: { safety: 3, airq: 2, supply: 4, community: 3, labor: 3, fit: 4 } } },
  { id: 'hybrid', label: 'Older hybrid', blurb: 'Placeholder values', vehicle: { name: 'My hybrid', short: 'My hybrid', kind: 'hybrid', price: 12000, mpg: 45, maintPerMile: 0.09, insurancePerYear: 1400, annualValueLoss: 0.08, materials: 4, ratings: { safety: 3, airq: 3, supply: 4, community: 3, labor: 3, fit: 3 } } }
];

/** Build the owned-car vehicle and its input notes from a preset. The Lexus keeps its sourced notes. */
export function currentCarFromPreset(presetId: string): { vehicle: Vehicle; meta: Record<string, ParamMeta>; ratingNotes: Record<string, string> } {
  const lexus = CATALOG.find((d) => d.vehicle.id === 'lx') as VehicleDef;
  if (presetId === 'lexus') return { vehicle: JSON.parse(JSON.stringify(lexus.vehicle)) as Vehicle, meta: JSON.parse(JSON.stringify(lexus.meta)) as Record<string, ParamMeta>, ratingNotes: { ...lexus.ratingNotes } };
  const p = CAR_PRESETS.find((x) => x.id === presetId) ?? CAR_PRESETS[1];
  const vehicle: Vehicle = {
    id: 'lx', owned: true, kwhPer100mi: 0, realWorldAdj: 1, embodiedT: 0, depreciation5yr: 0,
    ...JSON.parse(JSON.stringify(p.vehicle))
  } as Vehicle;
  const note = { note: GENERIC_NOTE };
  const meta = buildMeta(vehicle, { price: note, mpg: note, maintPerMile: { ...note, src: ['aaa'] }, insurancePerYear: note, annualValueLoss: note });
  return { vehicle, meta, ratingNotes: {} };
}
