// plugins/protovibe/src/ui/constants/tailwind.ts

const sizingScale = [
  { val: 'auto', desc: 'auto' }, { val: 'full', desc: '100%' }, { val: 'screen', desc: '100vw/vh' }, 
  { val: 'min-content', desc: '' }, { val: 'max-content', desc: '' }, { val: 'fit-content', desc: '' },
  { val: '1/2', desc: '50%' }, { val: '1/3', desc: '33%' }, { val: '2/3', desc: '66%' },
  { val: '1/4', desc: '25%' }, { val: '3/4', desc: '75%' },
  { val: '0', desc: '0px' }, { val: 'px', desc: '1px' }, { val: '1', desc: '4px' }, { val: '2', desc: '8px' }, 
  { val: '4', desc: '16px' }, { val: '6', desc: '24px' }, { val: '8', desc: '32px' }, { val: '12', desc: '48px' }, 
  { val: '16', desc: '64px' }, { val: '24', desc: '96px' }, { val: '32', desc: '128px' }, { val: '48', desc: '192px' },
  { val: '64', desc: '256px' }, { val: '96', desc: '384px' }
];

export const SCALES = {
  spacing: [
    { val: '0', desc: '0px' }, { val: 'px', desc: '1px' }, { val: '0.5', desc: '2px' }, { val: '1', desc: '4px' }, 
    { val: '1.5', desc: '6px' }, { val: '2', desc: '8px' }, { val: '2.5', desc: '10px' }, { val: '3', desc: '12px' }, 
    { val: '4', desc: '16px' }, { val: '5', desc: '20px' }, { val: '6', desc: '24px' }, { val: '8', desc: '32px' }, 
    { val: '10', desc: '40px' }, { val: '12', desc: '48px' }, { val: '16', desc: '64px' }, { val: '20', desc: '80px' }, 
    { val: '24', desc: '96px' }, { val: '32', desc: '128px' }, { val: '40', desc: '160px' }, { val: '48', desc: '192px' }, 
    { val: '64', desc: '256px' }, { val: 'auto', desc: 'auto' }
  ],
  fontFamily: [{ val: 'sans', desc: 'Sans' }, { val: 'serif', desc: 'Serif' }, { val: 'mono', desc: 'Mono' }],
  textSize: [
    { val: 'xs', desc: '12px' }, { val: 'sm', desc: '14px' }, { val: 'base', desc: '16px' }, { val: 'lg', desc: '18px' }, 
    { val: 'xl', desc: '20px' }, { val: '2xl', desc: '24px' }, { val: '3xl', desc: '30px' }, { val: '4xl', desc: '36px' }, 
    { val: '5xl', desc: '48px' }, { val: '6xl', desc: '60px' }, { val: '7xl', desc: '72px' }, { val: '8xl', desc: '96px' }
  ],
  size: sizingScale,
  radius: [
    { val: 'none', desc: '0px' }, { val: 'sm', desc: '2px' }, { val: 'DEFAULT', desc: '4px' },
    { val: 'md', desc: '6px' }, { val: 'lg', desc: '8px' }, { val: 'xl', desc: '12px' },
    { val: '2xl', desc: '16px' }, { val: '3xl', desc: '24px' }, { val: 'full', desc: '9999px' }
  ],
  borderWidth: [{ val: '0', desc: '0px' }, { val: 'DEFAULT', desc: '1px' }, { val: '2', desc: '2px' }, { val: '4', desc: '4px' }, { val: '8', desc: '8px' }],
  shadow: [{ val: 'sm', desc: 'Small' }, { val: 'DEFAULT', desc: 'Normal' }, { val: 'md', desc: 'Medium' }, { val: 'lg', desc: 'Large' }, { val: 'xl', desc: 'Extra Large' }, { val: '2xl', desc: '2XL' }, { val: 'inner', desc: 'Inner' }, { val: 'none', desc: 'None' }],
  opacity: [{ val: '0', desc: '0%' }, { val: '10', desc: '10%' }, { val: '25', desc: '25%' }, { val: '50', desc: '50%' }, { val: '75', desc: '75%' }, { val: '90', desc: '90%' }, { val: '100', desc: '100%' }],
  zIndex: [{ val: '0', desc: '' }, { val: '10', desc: '' }, { val: '20', desc: '' }, { val: '30', desc: '' }, { val: '40', desc: '' }, { val: '50', desc: '' }, { val: 'auto', desc: '' }]
};
