/* Texas CDL practice test sections.
 * draw  = number of questions pulled for one test attempt
 * pass  = number of correct answers needed (Texas requires 80% on every knowledge exam)
 * time  = suggested time limit in minutes for exam mode
 */
window.CDL_SECTIONS = [
  {
    id: 'general-knowledge',
    name: 'General Knowledge',
    code: 'Required',
    tier: 'core',
    draw: 50, pass: 40, time: 60,
    blurb: 'Vehicle inspection, basic control, space and speed management, hazard perception, emergencies, cargo, and driver rules.',
    who: 'Every applicant — Class A, B and C. You cannot get any CDL without passing this exam.',
    manual: 'Sections 1, 2, 3 and 5 of the Texas Commercial Motor Vehicle Drivers Handbook.'
  },
  {
    id: 'air-brakes',
    name: 'Air Brakes',
    code: 'Restriction L',
    tier: 'core',
    draw: 25, pass: 20, time: 30,
    blurb: 'Air system components, governor cut-in and cut-out, low-air warning, spring brakes, leak tests and the seven-step air brake check.',
    who: 'Anyone who will drive a vehicle with air brakes. Skip it and Texas stamps an "L" restriction on your license — no air brakes, ever.',
    manual: 'Section 5 of the Texas Commercial Motor Vehicle Drivers Handbook.'
  },
  {
    id: 'combination',
    name: 'Combination Vehicles',
    code: 'Class A',
    tier: 'core',
    draw: 20, pass: 16, time: 25,
    blurb: 'Rollover and jackknife prevention, rearward amplification, coupling and uncoupling, fifth wheel and tractor protection valve.',
    who: 'Every Class A applicant (tractor-trailer, truck with a heavy towed unit).',
    manual: 'Section 6 of the Texas Commercial Motor Vehicle Drivers Handbook.'
  },
  {
    id: 'doubles-triples',
    name: 'Doubles & Triples',
    code: 'Endorsement T',
    tier: 'endorsement',
    draw: 20, pass: 16, time: 25,
    blurb: 'Converter dollies, shut-off valves, trailer order and weight, and the extra rollover risk of the rear trailer.',
    who: 'Drivers pulling more than one trailer. Requires the T endorsement.',
    manual: 'Section 7 of the Texas Commercial Motor Vehicle Drivers Handbook.'
  },
  {
    id: 'tanker',
    name: 'Tank Vehicles',
    code: 'Endorsement N',
    tier: 'endorsement',
    draw: 20, pass: 16, time: 25,
    blurb: 'Liquid surge, baffled and smooth bore tanks, outage, high center of gravity, and smooth braking technique.',
    who: 'Drivers hauling liquids or gases in bulk packaging over 1,000 gallons. Requires the N endorsement.',
    manual: 'Section 8 of the Texas Commercial Motor Vehicle Drivers Handbook.'
  },
  {
    id: 'hazmat',
    name: 'Hazardous Materials',
    code: 'Endorsement H',
    tier: 'endorsement',
    draw: 30, pass: 24, time: 40,
    blurb: 'Shipping papers, placarding tables, segregation, loading and unloading rules, parking and attendance, and emergency response.',
    who: 'Drivers hauling placarded amounts of hazardous materials. Requires the H endorsement plus a TSA background check and fingerprints.',
    manual: 'Section 9 of the Texas Commercial Motor Vehicle Drivers Handbook.'
  },
  {
    id: 'passenger',
    name: 'Passenger Transport',
    code: 'Endorsement P',
    tier: 'endorsement',
    draw: 20, pass: 16, time: 25,
    blurb: 'Passenger and baggage rules, prohibited hazardous materials, railroad and drawbridge stops, and handling disruptive riders.',
    who: 'Drivers of any vehicle designed to carry 16 or more people including the driver. Requires the P endorsement.',
    manual: 'Section 4 of the Texas Commercial Motor Vehicle Drivers Handbook.'
  },
  {
    id: 'school-bus',
    name: 'School Bus',
    code: 'Endorsement S',
    tier: 'endorsement',
    draw: 20, pass: 16, time: 25,
    blurb: 'Danger zones and mirror checks, loading and unloading procedure, railroad crossings, evacuations and post-trip sweeps.',
    who: 'School bus drivers. Requires the S endorsement, and you must hold the P endorsement as well.',
    manual: 'Section 10 of the Texas Commercial Motor Vehicle Drivers Handbook.'
  },
  {
    id: 'pre-trip',
    name: 'Pre-Trip Inspection',
    code: 'Skills prep',
    tier: 'skills',
    draw: 20, pass: 16, time: 25,
    blurb: 'What you must find, name and check on the walk-around — the knowledge behind the pre-trip portion of the road skills exam.',
    who: 'Every applicant. The pre-trip is scored in person, but the examiner expects you to know these items cold.',
    manual: 'Sections 2 and 11 of the Texas Commercial Motor Vehicle Drivers Handbook.'
  }
];
