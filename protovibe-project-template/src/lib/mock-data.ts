export type SkillLevel = { 
  id: string; 
  name: string; 
  levelIndex: number; 
  description: string; 
  positions: string[] 
};

export type SkillPreview = {
  id: string;
  name: string;
  description: string;
  areaOfExpertise: string;
  category: string;
  isExisting: boolean;
  totalLevels: number;
  levels: SkillLevel[];
  applyAction: 'create' | 'skip'
};

export const skillsToImport: SkillPreview[] = [
  {
    id: 'sk1',
    name: 'Brand design',
    description: 'Creating and maintaining visual brand identities.',
    areaOfExpertise: 'Marketing',
    category: 'Design',
    isExisting: false,
    totalLevels: 3,
    applyAction: 'create',
    levels: [
      { id: 'l1a', name: 'Beginner', levelIndex: 1, description: '- Understands basic brand principles and color theory\n- Can apply existing brand guidelines consistently\n- Familiar with brand asset libraries and usage rules\n- Creates simple brand mockups under supervision\n- Recognizes brand inconsistencies in designs', positions: ['Junior Product Designer'] },
      { id: 'l1b', name: 'Intermediate', levelIndex: 2, description: '- Develops brand concepts from brief requirements\n- Refines visual identities and design systems\n- Creates mood boards and brand direction presentations\n- Manages brand consistency across multiple touchpoints\n- Collaborates with marketing and design teams on brand projects', positions: ['Product Designer', 'Senior Product Designer'] },
      { id: 'l1c', name: 'Advanced', levelIndex: 3, description: '- Leads comprehensive brand strategy initiatives\n- Creates sophisticated visual identity systems from scratch\n- Develops brand guidelines and governance documentation\n- Mentors junior designers on brand application\n- Influences brand direction at organizational level', positions: ['Senior Product Designer'] },
    ],
  },
  {
    id: 'sk2',
    name: 'Business acumen',
    description: 'Understanding business operations and strategy.',
    areaOfExpertise: 'Management',
    category: 'Strategic',
    isExisting: false,
    totalLevels: 4,
    applyAction: 'create',
    levels: [
      { id: 'l2a', name: 'Beginner', levelIndex: 1, description: '- Understands basic business terminology and organizational hierarchy\n- Knows key business metrics and their definitions\n- Recognizes departmental roles and responsibilities\n- Understands profit and loss concepts at basic level\n- Participates in business discussions with guidance', positions: ['HR Generalist', 'HR Business Partner'] },
      { id: 'l2b', name: 'Intermediate', levelIndex: 2, description: '- Analyzes departmental budgets and spending trends\n- Interprets business performance metrics independently\n- Understands market competition and industry dynamics\n- Connects HR initiatives to business objectives\n- Evaluates cost-benefit of operational decisions', positions: ['HR Business Partner', 'Talent Acquisition Manager'] },
      { id: 'l2c', name: 'Advanced', levelIndex: 3, description: '- Develops strategic initiatives aligned with company goals\n- Forecasts business impact of major decisions\n- Influences cross-functional business strategy\n- Manages complex P&L responsibilities\n- Drives revenue growth or cost optimization programs', positions: ['Senior Recruiter'] },
      { id: 'l2d', name: 'Expert', levelIndex: 4, description: '- Shapes organizational strategy and five-year planning\n- Influences board-level business decisions\n- Manages multi-million dollar strategic investments\n- Drives organizational transformation initiatives\n- Mentors executives on strategic thinking', positions: [] },
    ],
  },
  {
    id: 'sk3',
    name: 'Communication',
    description: 'Effective verbal and written communication.',
    areaOfExpertise: 'Soft skills',
    category: 'Interpersonal',
    isExisting: true,
    totalLevels: 5,
    applyAction: 'create',
    levels: [
      { id: 'l3a', name: 'Beginner', levelIndex: 1, description: '- Writes clear, grammatically correct emails and documents\n- Explains tasks and updates in understandable language\n- Listens actively in one-on-one conversations\n- Asks clarifying questions when confused\n- Responds promptly to messages and communications', positions: ['HR Assistant', 'Junior Recruiter', 'Junior Product Designer'] },
      { id: 'l3b', name: 'Intermediate', levelIndex: 2, description: '- Presents ideas effectively in team meetings\n- Adapts communication style for different audiences\n- Writes compelling reports and proposals\n- Facilitates productive discussions and collaboration\n- Provides constructive feedback clearly and respectfully', positions: ['Recruiter', 'Product Designer', 'HR Generalist'] },
      { id: 'l3c', name: 'Advanced', levelIndex: 3, description: '- Persuasively presents complex ideas to senior stakeholders\n- Communicates with confidence in high-stakes situations\n- Crafts compelling narratives that drive decision-making\n- Mentors others on communication skills\n- Influences opinions through strategic messaging', positions: ['Senior Recruiter', 'Senior Product Designer', 'Talent Acquisition Manager', 'HR Business Partner'] },
      { id: 'l3d', name: 'Expert', levelIndex: 4, description: '- Influences organizational culture through authentic communication\n- Delivers transformational messages at scale\n- Navigates complex political situations diplomatically\n- Shapes company narrative and brand voice\n- Coaches executives on communication strategy', positions: [] },
      { id: 'l3e', name: 'Master', levelIndex: 5, description: '- Sets organizational communication standards\n- Creates communication frameworks that outlast leadership\n- Recognized internally and externally as thought leader\n- Mentors future communication leaders\n- Transforms entire cultures through masterful communication', positions: [] },
    ],
  },
  {
    id: 'sk4',
    name: 'Figma',
    description: 'Advanced UI/UX design using Figma.',
    areaOfExpertise: 'Design',
    category: 'Tools',
    isExisting: false,
    totalLevels: 4,
    applyAction: 'create',
    levels: [
      { id: 'l4a', name: 'Beginner', levelIndex: 1, description: '- Navigates Figma interface confidently\n- Creates and organizes basic design components\n- Uses Figma libraries for design consistency\n- Participates in collaborative design projects\n- Exports and shares designs for feedback', positions: ['Junior Product Designer'] },
      { id: 'l4b', name: 'Intermediate', levelIndex: 2, description: '- Builds reusable component systems in Figma\n- Creates interactive prototypes with multiple screens\n- Manages design files and team collaboration workflows\n- Uses advanced features like variants and auto-layout\n- Implements responsive design in Figma', positions: ['Product Designer'] },
      { id: 'l4c', name: 'Advanced', levelIndex: 3, description: '- Designs complex multi-screen interactive prototypes\n- Manages large-scale design systems at organizational level\n- Implements sophisticated auto-layout and constraint systems\n- Mentors junior designers on Figma best practices\n- Integrates Figma with development workflows', positions: ['Senior Product Designer'] },
      { id: 'l4d', name: 'Expert', levelIndex: 4, description: '- Establishes design system governance and standards\n- Optimizes Figma workflows for entire teams\n- Creates advanced plugin integrations and automation\n- Leads design tool strategy and adoption\n- Mentors design leaders on Figma at scale', positions: [] },
    ],
  },
  {
    id: 'sk5',
    name: 'Leadership',
    description: 'Guiding and mentoring teams to success.',
    areaOfExpertise: 'Soft skills',
    category: 'Management',
    isExisting: true,
    totalLevels: 5,
    applyAction: 'create',
    levels: [
      { id: 'l5a', name: 'Beginner', levelIndex: 1, description: '- Takes initiative on assigned projects\n- Supports team members and offers help proactively\n- Follows through on commitments reliably\n- Shows enthusiasm and positive attitude\n- Seeks mentorship and learns from feedback', positions: ['HR Assistant', 'Junior Recruiter'] },
      { id: 'l5b', name: 'Intermediate', levelIndex: 2, description: '- Leads small projects from start to completion\n- Motivates team members and celebrates wins\n- Delegates tasks and holds team accountable\n- Develops informal mentoring relationships\n- Resolves conflicts between team members', positions: ['Recruiter', 'HR Generalist', 'Talent Acquisition Manager'] },
      { id: 'l5c', name: 'Advanced', levelIndex: 3, description: '- Manages departments of 5-20+ people effectively\n- Develops team members strategically for growth\n- Creates high-performing cultures within teams\n- Manages performance and difficult conversations\n- Balances business needs with employee development', positions: ['Senior Recruiter', 'HR Business Partner'] },
      { id: 'l5d', name: 'Expert', levelIndex: 4, description: '- Leads cross-functional initiatives across organizations\n- Shapes organizational culture and values\n- Develops other leaders and succession pipelines\n- Influences company-wide strategic direction\n- Creates lasting impact on organizational capability', positions: [] },
      { id: 'l5e', name: 'Master', levelIndex: 5, description: '- Visionary leader who transforms organizational culture\n- Develops multiple generations of future leaders\n- Creates legacy of leadership excellence\n- Recognized as thought leader in industry\n- Mentors C-suite executives and founders', positions: [] },
    ],
  },
  {
    id: 'sk6',
    name: 'React',
    description: 'Frontend development with React.js.',
    areaOfExpertise: 'Software development',
    category: 'Frontend',
    isExisting: false,
    totalLevels: 4,
    applyAction: 'create',
    levels: [
      { id: 'l6a', name: 'Beginner', levelIndex: 1, description: '- Understands React component lifecycle and props\n- Builds functional components with basic hooks\n- Uses state management with useState\n- Handles simple form inputs and events\n- Creates basic component composition', positions: [] },
      { id: 'l6b', name: 'Intermediate', levelIndex: 2, description: '- Develops full-featured applications with multiple pages\n- Implements complex state with Redux or Context API\n- Uses React hooks effectively (useEffect, useCallback, etc.)\n- Handles API integration and async operations\n- Creates reusable component libraries', positions: [] },
      { id: 'l6c', name: 'Advanced', levelIndex: 3, description: '- Optimizes application performance and rendering\n- Implements advanced patterns (render props, compound components)\n- Manages complex application state architecture\n- Builds real-time and data-intensive applications\n- Mentors junior developers on React best practices', positions: [] },
      { id: 'l6d', name: 'Expert', levelIndex: 4, description: '- Architects enterprise-scale React applications\n- Designs scalable state management solutions\n- Contributes to React ecosystem (libraries, frameworks)\n- Optimizes for performance at massive scale\n- Leads technical decisions for frontend platforms', positions: [] },
    ],
  },
];

export const mockEmployees = [
  { id: '1', name: 'Alice Johnson', role: 'Senior Product Designer', department: 'Design', status: 'Active', email: 'alice.j@acmecorp.com', phone: '+1 (555) 123-4567', location: 'New York, NY', startDate: '2021-03-15' },
  { id: '2', name: 'Bob Smith', role: 'Frontend Engineer', department: 'Engineering', status: 'Active', email: 'bob.s@acmecorp.com', phone: '+1 (555) 987-6543', location: 'Remote (US)', startDate: '2022-08-01' },
  { id: '3', name: 'Carol Davis', role: 'Marketing Manager', department: 'Marketing', status: 'On Leave', email: 'carol.d@acmecorp.com', phone: '+1 (555) 555-0192', location: 'London, UK', startDate: '2019-11-10' },
  { id: '4', name: 'David Wilson', role: 'HR Business Partner', department: 'Human Resources', status: 'Active', email: 'david.w@acmecorp.com', phone: '+1 (555) 444-3333', location: 'San Francisco, CA', startDate: '2023-01-20' },
  { id: '5', name: 'Eve Martinez', role: 'Data Scientist', department: 'Data', status: 'Terminated', email: 'eve.m@acmecorp.com', phone: '+1 (555) 222-1111', location: 'Austin, TX', startDate: '2020-05-05' },
];

export const mockPositions = [
  { id: 'p1', title: 'Senior React Developer', department: 'Engineering', location: 'Remote', applicants: 24, status: 'Open' },
  { id: 'p2', title: 'Product Marketing Manager', department: 'Marketing', location: 'New York, NY', applicants: 12, status: 'Interviewing' },
  { id: 'p3', title: 'UX Researcher', department: 'Design', location: 'London, UK', applicants: 8, status: 'Open' },
];

export const mockDepartments = [
  { id: 'd1', name: 'Engineering', manager: 'Sarah Connor', headcount: 45, budget: 'On Track' },
  { id: 'd2', name: 'Design', manager: 'John Doe', headcount: 12, budget: 'At Risk' },
  { id: 'd3', name: 'Marketing', manager: 'Jane Smith', headcount: 28, budget: 'On Track' },
  { id: 'd4', name: 'Human Resources', manager: 'Michael Scott', headcount: 8, budget: 'Under Budget' },
];

export const availablePositions = [
  'HR Assistant', 'Junior Recruiter', 'Recruiter', 'HR Generalist',
  'Senior Recruiter', 'Talent Acquisition Manager', 'HR Business Partner',
  'Junior Product Designer', 'Senior Product Designer', 'Product Designer',
];
