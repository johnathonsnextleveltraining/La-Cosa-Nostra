// Source-specific disclosure only; this does not change counts or rate calculations.
export const hovaCbbSource = 'https://docs.google.com/spreadsheets/d/1L6pY-Fzb4VJVc54Z-90AHA__gcK6PTli8WRNnA52u0g/edit#gid=101963621&range=A11:E11';
export const hovaCbbDisclosure = 'Nov 9 CBB: Hova follows Rithmm’s side where available. Their matching picks are not two independent reads. Agreement counts and historical records are unchanged.';
export function hasDependentCbbAgreement(date:string, b:{sport?:string;all?:string[];names?:string[]}):boolean {
  const names=b.all??b.names??[];
  return date==='2026-11-09'&&b.sport==='CBB'&&names.includes('Hova Da God')&&names.includes('Rithmm');
}
