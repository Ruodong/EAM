import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.eAReviewLog.deleteMany();
  await prisma.action.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.eARequest.deleteMany();
  await prisma.application.deleteMany();
  await prisma.bCPFMasterData.deleteMany();
  await prisma.technologyStack.deleteMany();
  await prisma.certification.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // --- Users ---
  await prisma.user.createMany({
    data: [
      { username: 'dongjha', displayName: 'Judy Dong', email: 'dongjha@lenovo.com', role: 'reviewer' },
      { username: 'luoyl2', displayName: 'Cherry YL2 Luo', email: 'luoyl2@lenovo.com', role: 'reviewer' },
      { username: 'hanhw1', displayName: 'Han HW1', email: 'hanhw1@lenovo.com', role: 'reviewer' },
      { username: 'zhengyq7', displayName: 'Yongqing YQ7 Zheng', email: 'zhengyq7@lenovo.com', role: 'user' },
      { username: 'wangcy44', displayName: 'Andy CY44 Wang', email: 'wangcy44@lenovo.com', role: 'user' },
      { username: 'liucheng4', displayName: 'Cheng Cheng4 Liu', email: 'liucheng4@lenovo.com', role: 'user' },
      { username: 'majun2', displayName: 'Jun2 Ma', email: 'majun2@lenovo.com', role: 'user' },
      { username: 'guoxc5', displayName: 'Mark XC5 Guo', email: 'guoxc5@lenovo.com', role: 'user' },
      { username: 'fengkun2', displayName: 'Kun Kun2 Feng', email: 'fengkun2@lenovo.com', role: 'user' },
      { username: 'songyuan1', displayName: 'Yuan Song', email: 'songyuan1@lenovo.com', role: 'user' },
    ],
  });

  // --- Projects ---
  const projectData = [
    { projectId: 'LI2500001', projectName: 'ODM Swift Shift Project', pm: 'Harriet HQ16', dtLead: 'Brian YQ38 Z', itLead: 'Edison YY Lei', aiRelated: 'No' },
    { projectId: 'LI2500029', projectName: 'PRC AI APP', pm: 'Jean Yan4 Jin', dtLead: 'Lichao LC7 Liu', itLead: 'Yongmei YM1', aiRelated: 'No' },
    { projectId: 'LI2500093', projectName: 'Intelligent Sales Forecast', pm: 'Jennifer Caite', dtLead: 'Shashin Mant', itLead: 'Pete Huang', aiRelated: 'No' },
    { projectId: 'LI2500184', projectName: 'Phoenix-LCR Model 4 in IN', pm: 'Steven Yao1 Mo', dtLead: 'Steven Yao1 Mo', itLead: 'Yue Yue18 Zh', aiRelated: 'No' },
    { projectId: 'LI2500265', projectName: 'FY25 PD ISG SR Project', pm: 'Weijie WJ2 Kou', dtLead: 'Weijie WJ2 Kou', itLead: 'Tomcat Gang', aiRelated: 'No' },
    { projectId: 'LI2500037', projectName: 'DCSC Configurator - CPQ', pm: 'James Barrett', dtLead: 'James Barrett', itLead: 'Anna Dan2 So', aiRelated: 'No' },
    { projectId: 'LI2500267', projectName: 'Project Metal', pm: 'Tuofu MTF1 Z', dtLead: 'Michael Hao4', itLead: 'Jun2 Ma', aiRelated: 'No' },
    { projectId: 'LI2500010', projectName: 'Workday-Gloat Integration', pm: 'Jane Campbell', dtLead: 'Jane Campbell', itLead: 'Kamala Mahesh', aiRelated: 'No' },
    { projectId: 'LI2400443', projectName: 'FY25 PRC Super AI Agent P', pm: 'Sarah XY14 Li', dtLead: 'Shuo Zhou', itLead: 'Yong Yong8 Y', aiRelated: 'Yes' },
    { projectId: 'LI2500054', projectName: 'ISO SR FY2526', pm: 'Melanie Ran1', dtLead: 'Melanie Ran1', itLead: 'Brownie Yue8', aiRelated: 'No' },
    { projectId: 'LI2500091', projectName: 'Project Productivity', pm: 'Mia MY60 Wang', dtLead: 'Brian YQ38 Z', itLead: 'Edison YY Lei', aiRelated: 'No' },
    { projectId: 'LI2500019', projectName: 'Helix', pm: 'Andy CY44 Wang', dtLead: 'Bobo Wang', itLead: 'Stephanie Perche', aiRelated: 'No' },
    { projectId: 'LI2500058', projectName: 'KSA Oasis DTIT Project', pm: 'Wendy Fang1 Wei', dtLead: 'Ruby Tao', itLead: 'Hongyao HY4 Yu', aiRelated: 'No' },
    { projectId: 'LI2500172', projectName: 'H-Service Procurement', pm: 'zhaoyang ZY60 Liu', dtLead: '', itLead: '', aiRelated: 'No' },
    { projectId: 'LI2500189', projectName: 'Lenovo Brain Platform', pm: 'Angelina Li', dtLead: 'QiangA Guo', itLead: 'Tianfu TF2 Wu', aiRelated: 'Yes' },
    { projectId: 'LI2500200', projectName: 'Project Elliot FY2526', pm: 'Guangqiu Chen', dtLead: '', itLead: '', aiRelated: 'No' },
    { projectId: 'LI2500248', projectName: 'FY2526 WHS', pm: 'Gang Gang1 Nie', dtLead: 'Gang Gang1 Nie', itLead: 'Gang Gang1 Nie', aiRelated: 'No' },
    { projectId: 'LI2500303', projectName: 'SSG AI Agent', pm: '', dtLead: '', itLead: '', aiRelated: 'Yes' },
    { projectId: 'LI2500312', projectName: 'CSP T1 Account Ownership', pm: '', dtLead: '', itLead: '', aiRelated: 'No' },
  ];

  for (const p of projectData) {
    await prisma.project.create({
      data: { ...p, highFocus: false, createdBy: 'system', createdAt: new Date('2025-01-01') },
    });
  }

  // --- EA Requests ---
  const eaRequestData = [
    { requestId: 'EA250129', requestName: 'LI2500091 - Project Productivity', requestStatus: 'Completed', reviewResult: 'Approved', reviewScope: 'All', projectId: 'LI2500091', projectName: 'Project Productivity', requestor: 'Yongqing YQ7 Zheng', assignedReviewer: 'Judy Dong', pm: 'Mia MY60 Wang', dtLead: 'Helen Hui30 Chen', itLead: 'Lei Lei2 Qin', changedBy: 'dongjha', changedAt: new Date('2026-03-06T09:38:45'), createdBy: 'zhengyq7', createdAt: new Date('2026-02-04T09:49:26') },
    { requestId: 'EA250177', requestName: 'LI2500019 - Helix - Gradial', requestStatus: 'Submitted', reviewResult: '', reviewScope: 'Part of Project', projectId: 'LI2500019', projectName: 'Helix', wsName: 'Gradial', requestor: 'Andy CY44 Wang', assignedReviewer: '', pm: 'Andy CY44 Wang', dtLead: 'Stephanie Perche', itLead: 'Bobo Wang', changedBy: 'wangcy44', changedAt: new Date('2026-03-05T22:48:55'), createdBy: 'wangcy44', createdAt: new Date('2026-03-05T22:43:35') },
    { requestId: 'EA250166', requestName: 'FY2526-162 - 中国区引入TRAE AI代码工具', requestStatus: 'Completed', reviewResult: 'Approved', reviewScope: 'All', projectId: 'FY2526-162', projectName: '中国区引入TRAE AI代码工具', requestor: 'Cheng Cheng4 Liu', assignedReviewer: 'Cherry YL2 Luo', pm: 'Cheng Cheng4 Liu', dtLead: 'Tianfu TF2 Wu', itLead: 'QiangA Guo', changedBy: 'hanhw1', changedAt: new Date('2026-03-05T15:57:42'), createdBy: 'liucheng4', createdAt: new Date('2026-03-02T16:56:20') },
    { requestId: 'EA250175', requestName: 'LI2500267 - Project Metal', requestStatus: 'In Progress', reviewResult: 'Accepted by EA', reviewScope: 'All', projectId: 'LI2500267', projectName: 'Project Metal', requestor: 'Jun2 Ma', assignedReviewer: 'Judy Dong', pm: 'Tuofu MTF1 Zha', dtLead: 'Michael Hao4 Dong', itLead: 'Jun2 Ma', changedBy: 'luoyl2', changedAt: new Date('2026-03-05T14:42:14'), createdBy: 'majun2', createdAt: new Date('2026-03-04T18:12:09') },
    { requestId: 'EA250053', requestName: 'FY2526-126 - ADM AI Service', requestStatus: 'Completed', reviewResult: 'Approved', reviewScope: 'All', projectId: 'FY2526-126', projectName: 'ADM AI Service', requestor: 'Mark XC5 Guo', assignedReviewer: 'Cherry YL2 Luo', pm: 'Qi Qi5 Fang', dtLead: 'Gang Gang1 Nie', itLead: 'Gang Gang1 Nie', changedBy: 'hanhw1', changedAt: new Date('2026-03-05T09:47:03'), createdBy: 'guoxc5', createdAt: new Date('2026-01-16T15:27:30') },
    { requestId: 'EA250176', requestName: 'LI2500058 - KSA Oasis DTIT Project - DLMS for KSA', requestStatus: 'Draft', reviewResult: '', reviewScope: 'Part of Project', projectId: 'LI2500058', projectName: 'KSA Oasis DTIT Project', wsName: 'DLMS for KSA', requestor: 'Denise Silveira', assignedReviewer: '', pm: 'Wendy Fang1 Wei', dtLead: 'Ruby Tao', itLead: 'Hongyao HY4 Yu', changedBy: 'denisesilveira', changedAt: new Date('2026-03-04T20:04:09'), createdBy: 'denisesilveira', createdAt: new Date('2026-03-04T20:03:39') },
    { requestId: 'EA250173', requestName: 'FY2526-168 - enable ZOOM AI Companion', requestStatus: 'Submitted', reviewResult: '', reviewScope: 'Part of Project', projectId: 'FY2526-168', projectName: 'enable ZOOM AI Companion and cloud record', wsName: 'ZOOM AI and cloud record', requestor: 'Yuan Song', assignedReviewer: '', pm: 'Yuan Song', dtLead: 'Yuan Song', itLead: 'LoKi Liu', changedBy: 'songyuan1', changedAt: new Date('2026-03-04T17:52:45'), createdBy: 'songyuan1', createdAt: new Date('2026-03-04T14:48:16') },
    { requestId: 'EA250174', requestName: 'LI2500172 - H-Service Procurement', requestStatus: 'Submitted', reviewResult: '', reviewScope: 'Part of Project', projectId: 'LI2500172', projectName: 'H-Service Procurement', wsName: 'H3 AI-Driven Vendor Support', requestor: 'Shiqiang SQ15 Zhang', assignedReviewer: '', pm: 'zhaoyang ZY60 Liu', changedBy: 'zhangsq15', changedAt: new Date('2026-03-04T16:42:25'), createdBy: 'zhangsq15', createdAt: new Date('2026-03-04T16:13:41') },
    { requestId: 'EA250148', requestName: 'FY2526-157 - 企业微信', requestStatus: 'Submitted', reviewResult: '', reviewScope: 'All', projectId: 'FY2526-157', projectName: '企业微信', requestor: 'Xuefei XF7 Fan', assignedReviewer: '', pm: 'Xuefei XF7 Fan', dtLead: 'LongE Chen', itLead: 'Rui Rui18 Ma', changedBy: 'fanxf7', changedAt: new Date('2026-03-04T15:55:59'), createdBy: 'fanxf7', createdAt: new Date('2026-02-10T17:25:01') },
    { requestId: 'EA250100', requestName: 'FY2526-138 - FY25-OACP ADFS集成', requestStatus: 'Completed', reviewResult: 'Approved', reviewScope: 'Part of Project', projectId: 'FY2526-138', projectName: 'FY25-OACP ADFS集成', wsName: 'OACP2.0 ADFS集成改造', requestor: 'Gang Gang1 Nie', assignedReviewer: 'Kun Kun2 Feng', pm: 'Gang Gang1 Nie', dtLead: 'Gang Gang1 Nie', itLead: 'Gang Gang1 Nie', changedBy: 'fengkun2', changedAt: new Date('2026-03-04T14:38:22'), createdBy: 'niegang1', createdAt: new Date('2026-01-28T14:27:21') },
  ];

  for (const r of eaRequestData) {
    await prisma.eARequest.create({ data: r });
  }

  // --- Meetings ---
  const meetingData = [
    { meetingNo: 1111, requestName: 'EA250166 - FY2526-162', projectId: 'FY2526-162', projectName: '中国区引入TRAE AI代码工具', meetingTitle: 'EA Review - FY2526-162', startTime: new Date('2026-03-04T16:00:00'), endTime: new Date('2026-03-04T17:00:00'), createdBy: 'system' },
    { meetingNo: 1110, requestName: '', projectId: 'LI2500189', projectName: 'Lenovo Brain Platform', meetingTitle: 'Lenovo Brain EA Review', startTime: new Date('2026-03-04T14:30:00'), endTime: new Date('2026-03-04T15:30:00'), createdBy: 'system' },
    { meetingNo: 1109, requestName: 'EA250100 - FY2526-138', projectId: 'FY2526-138', projectName: 'FY25-OACP ADFS集成', meetingTitle: 'oacp 集成adfs EA Review', startTime: new Date('2026-03-04T14:00:00'), endTime: new Date('2026-03-04T14:30:00'), createdBy: 'system' },
    { meetingNo: 1108, requestName: 'EA250144 - LI2500303', projectId: 'LI2500303', projectName: 'SSG AI Agent', meetingTitle: 'EA Review - EA250144', startTime: new Date('2026-02-28T11:00:00'), endTime: new Date('2026-02-28T12:00:00'), createdBy: 'system' },
    { meetingNo: 1106, requestName: 'EA250139 - FY2526-148', projectId: 'FY2526-148', projectName: 'A004505-Data Analytics', meetingTitle: 'EA Review - EA250139', startTime: new Date('2026-02-27T14:00:00'), endTime: new Date('2026-02-27T15:00:00'), createdBy: 'system' },
    { meetingNo: 1107, requestName: 'EA250158 - LI2500058', projectId: 'LI2500058', projectName: 'KSA Oasis DTIT Project', meetingTitle: 'EA Review - EA250158', startTime: new Date('2026-02-27T16:30:00'), endTime: new Date('2026-02-27T17:00:00'), createdBy: 'system' },
    { meetingNo: 1105, requestName: 'EA250135 - LI2500248', projectId: 'LI2500248', projectName: 'FY2526 WHS', meetingTitle: '智能仓四期项目EA Review', startTime: new Date('2026-02-27T11:00:00'), endTime: new Date('2026-02-27T11:30:00'), createdBy: 'system' },
    { meetingNo: 1104, requestName: 'EA250140 - LI2500312', projectId: 'LI2500312', projectName: 'CSP T1 Account Ownership', meetingTitle: 'EA Review - LI2500312', startTime: new Date('2026-02-27T10:00:00'), endTime: new Date('2026-02-27T10:30:00'), createdBy: 'system' },
    { meetingNo: 1103, requestName: 'EA250056 - FY2526-131', projectId: 'FY2526-131', projectName: 'tarifffix', meetingTitle: 'EA Review - EA250056', startTime: new Date('2026-02-26T17:00:00'), endTime: new Date('2026-02-26T17:30:00'), createdBy: 'system' },
    { meetingNo: 1102, requestName: 'EA250110 - FY2526-145', projectId: 'FY2526-145', projectName: 'WHSC鲁班智能体', meetingTitle: 'EA审核 -- 鲁班智能体', startTime: new Date('2026-02-26T16:00:00'), endTime: new Date('2026-02-26T17:00:00'), createdBy: 'system' },
  ];

  for (const m of meetingData) {
    await prisma.meeting.create({ data: m });
  }

  // --- Actions ---
  const actionData = [
    { actionId: 1597, requestName: 'EA250129 - LI2500091', projectId: 'LI2500091', projectName: 'Project Productivity', actionTitle: 'Application architecture review', type: 'Mandatory', priority: 'Medium', requestedBy: 'Judy Dong', assignee: 'Yongqing YQ7 Zheng', status: 'Closed', createdBy: 'dongjha' },
    { actionId: 1598, requestName: 'EA250129 - LI2500091', projectId: 'LI2500091', projectName: 'Project Productivity', actionTitle: 'Technical architecture documentation', type: 'Mandatory', priority: 'Medium', requestedBy: 'Judy Dong', assignee: 'Yongqing YQ7 Zheng', status: 'Closed', createdBy: 'dongjha' },
    { actionId: 1628, requestName: 'EA250140 - LI2500312', projectId: 'LI2500312', projectName: 'CSP T1 Account Ownership', actionTitle: '技术架构图：按模板调整', type: 'Mandatory', priority: 'Medium', requestedBy: 'Judy Dong', assignee: 'CSP Team', status: 'Closed', createdBy: 'dongjha' },
    { actionId: 1608, requestName: 'EA250053 - FY2526-126', projectId: 'FY2526-126', projectName: 'ADM AI Service', actionTitle: '在EAM补充技术栈和版本', type: 'Mandatory', priority: 'Medium', requestedBy: 'Cherry YL2 Luo', assignee: 'Mark XC5 Guo', status: 'Closed', createdBy: 'luoyl2' },
    { actionId: 1631, requestName: 'EA250166 - FY2526-162', projectId: 'FY2526-162', projectName: '中国区引入TRAE AI代码工具', actionTitle: '技术架构需进行以下修改', type: 'Mandatory', priority: 'Medium', requestedBy: 'Cherry YL2 Luo', assignee: 'Cheng Cheng4 Liu', status: 'Closed', createdBy: 'luoyl2' },
    { actionId: 1606, requestName: 'EA250053 - FY2526-126', projectId: 'FY2526-126', projectName: 'ADM AI Service', actionTitle: '应用架构图：按模板调整', type: 'Mandatory', priority: 'Medium', requestedBy: 'Cherry YL2 Luo', assignee: 'Mark XC5 Guo', status: 'Closed', createdBy: 'luoyl2' },
    { actionId: 1630, requestName: '', projectId: 'LI2500189', projectName: 'Lenovo Brain Platform', actionTitle: '补充并更新应用架构图和技术架构图', type: 'Mandatory', priority: 'Medium', requestedBy: 'Cherry YL2 Luo', assignee: 'Brain Team', status: 'Open', createdBy: 'luoyl2' },
    { actionId: 1542, requestName: 'EA250082 - LI2500189', projectId: 'LI2500189', projectName: 'Lenovo Brain Platform', actionTitle: 'AIForce multiple agent architecture', type: 'Mandatory', priority: 'Medium', requestedBy: 'Cherry YL2 Luo', assignee: 'Brain Team', status: 'Closed', createdBy: 'luoyl2' },
    { actionId: 1629, requestName: 'EA250100 - FY2526-138', projectId: 'FY2526-138', projectName: 'FY25-OACP ADFS集成', actionTitle: 'Update tech solution diagram', type: 'Mandatory', priority: 'Medium', requestedBy: 'Kun Kun2 Feng', assignee: 'Gang Gang1 Nie', status: 'Open', createdBy: 'fengkun2' },
  ];

  for (const a of actionData) {
    await prisma.action.create({ data: { ...a, createdAt: new Date() } });
  }

  // --- BCPF Master Data ---
  const bcpfData = [
    { bcId: 'C1', bcName: 'Product Development', domainL1: 'Product Development', subDomainL2: '', capabilityGroupL3: '', level: 1, version: '1.4' },
    { bcId: 'C1.1', bcName: 'Portfolio & Planning Management', domainL1: 'Product Development', subDomainL2: 'Portfolio & Planning Management', capabilityGroupL3: '', level: 2, version: '1.4' },
    { bcId: 'C1.1.1', bcName: 'Strategy Definition', domainL1: 'Product Development', subDomainL2: 'Portfolio & Planning Management', capabilityGroupL3: 'Strategy Definition', level: 3, version: '1.4' },
    { bcId: 'C1.1.2', bcName: 'Product Portfolio Planning', domainL1: 'Product Development', subDomainL2: 'Portfolio & Planning Management', capabilityGroupL3: 'Product Portfolio Planning', level: 3, version: '1.4' },
    { bcId: 'C1.1.3', bcName: 'Building Block Planning', domainL1: 'Product Development', subDomainL2: 'Portfolio & Planning Management', capabilityGroupL3: 'Building Block Planning', level: 3, version: '1.4' },
    { bcId: 'C1.1.4', bcName: 'Product Planning', domainL1: 'Product Development', subDomainL2: 'Portfolio & Planning Management', capabilityGroupL3: 'Product Planning', level: 3, version: '1.4' },
    { bcId: 'C1.1.5', bcName: 'Portfolio Analytics', domainL1: 'Product Development', subDomainL2: 'Portfolio & Planning Management', capabilityGroupL3: 'Portfolio Analytics', level: 3, version: '1.4' },
    { bcId: 'C1.2', bcName: 'Development Project Management', domainL1: 'Product Development', subDomainL2: 'Development Project Management', capabilityGroupL3: '', level: 2, version: '1.4' },
    { bcId: 'C1.2.1', bcName: 'Project Execution', domainL1: 'Product Development', subDomainL2: 'Development Project Management', capabilityGroupL3: 'Project Execution', level: 3, version: '1.4' },
    { bcId: 'C1.2.2', bcName: 'Project Quality', domainL1: 'Product Development', subDomainL2: 'Development Project Management', capabilityGroupL3: 'Project Quality', level: 3, version: '1.4' },
    { bcId: 'C2', bcName: 'Supply Chain', domainL1: 'Supply Chain', subDomainL2: '', capabilityGroupL3: '', level: 1, version: '1.4' },
    { bcId: 'C3', bcName: 'Sales & Marketing', domainL1: 'Sales & Marketing', subDomainL2: '', capabilityGroupL3: '', level: 1, version: '1.4' },
    { bcId: 'C4', bcName: 'Service & Support', domainL1: 'Service & Support', subDomainL2: '', capabilityGroupL3: '', level: 1, version: '1.4' },
    { bcId: 'C5', bcName: 'Finance', domainL1: 'Finance', subDomainL2: '', capabilityGroupL3: '', level: 1, version: '1.4' },
    { bcId: 'C6', bcName: 'Human Resources', domainL1: 'Human Resources', subDomainL2: '', capabilityGroupL3: '', level: 1, version: '1.4' },
  ];

  for (const b of bcpfData) {
    await prisma.bCPFMasterData.create({ data: b });
  }

  // --- Applications ---
  const appData = [
    { applicationId: 'A004606', applicationName: 'NexBill', applicationOwnership: 'CIO/CDTO', applicationSolutionOwner: 'zwang12', applicationDTOwner: 'ssundar', applicationStatus: 'Planned', bcId: 'C5.7.7' },
    { applicationId: 'A004600', applicationName: 'One PRM', applicationOwnership: 'CIO/CDTO', applicationSolutionOwner: 'ayie', applicationDTOwner: 'jennifer.khan', applicationStatus: 'Planned', bcId: 'C3.5.4' },
  ];

  for (const a of appData) {
    await prisma.application.create({ data: a });
  }

  // --- Technology Stack ---
  const techData = [
    { name: 'Java', category: 'Programming Language', vendor: 'Oracle', version: '17', status: 'Active', owner: 'EA Team' },
    { name: 'Python', category: 'Programming Language', vendor: 'Python Foundation', version: '3.12', status: 'Active', owner: 'EA Team' },
    { name: 'React', category: 'Frontend Framework', vendor: 'Meta', version: '18', status: 'Active', owner: 'EA Team' },
    { name: 'Spring Boot', category: 'Backend Framework', vendor: 'VMware', version: '3.2', status: 'Active', owner: 'EA Team' },
    { name: 'PostgreSQL', category: 'Database', vendor: 'PostgreSQL', version: '16', status: 'Active', owner: 'EA Team' },
    { name: 'Redis', category: 'Cache', vendor: 'Redis', version: '7', status: 'Active', owner: 'EA Team' },
    { name: 'Kubernetes', category: 'Container Orchestration', vendor: 'CNCF', version: '1.28', status: 'Active', owner: 'EA Team' },
    { name: 'Kafka', category: 'Message Queue', vendor: 'Apache', version: '3.6', status: 'Active', owner: 'EA Team' },
    { name: 'Elasticsearch', category: 'Search Engine', vendor: 'Elastic', version: '8.11', status: 'Active', owner: 'EA Team' },
    { name: 'Nginx', category: 'Web Server', vendor: 'F5', version: '1.25', status: 'Active', owner: 'EA Team' },
  ];

  for (const t of techData) {
    await prisma.technologyStack.create({ data: t });
  }

  // --- EA Review Logs ---
  const logData = [
    { projectId: 'LI2500200', projectName: 'Project Elliot FY2526', user: 'Guangqiu Chen', operationTime: new Date('2025-12-03T17:58:13'), action: 'Complete EA Review', comments: '' },
    { projectId: 'FY2526-066', projectName: 'LME TDC System', user: 'Jianhua Dong', operationTime: new Date('2025-10-13T10:30:43'), action: 'Complete EA Review', comments: '' },
    { projectId: 'FY2526-066', projectName: 'LME TDC System', user: 'Yinglin Luo', operationTime: new Date('2025-10-13T10:30:11'), action: 'Accept EA Review Request', comments: '' },
    { projectId: 'FY2526-066', projectName: 'LME TDC System', user: 'Yinglin Luo', operationTime: new Date('2025-10-13T10:30:08'), action: 'Submit for EA Review', comments: '' },
    { projectId: 'FY2425-049', projectName: 'AI LeCat Voice / Email & Meeting AI', user: 'Dongfang Zhao', operationTime: new Date('2025-03-27T17:38:30'), action: 'Submit for EA Review', comments: '' },
    { projectId: 'FY2425-032', projectName: 'DC Fusion', user: 'Jianhua Dong', operationTime: new Date('2025-02-06T17:23:42'), action: 'Approved', comments: 'actions已经完成了。' },
  ];

  for (const l of logData) {
    await prisma.eAReviewLog.create({ data: l });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
