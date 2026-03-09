'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

type Locale = 'en' | 'zh';

interface LocaleContextValue {
  locale: Locale;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  toggleLocale: () => {},
});

// ── Translation dictionary: English → Chinese ──
const zhDict: Record<string, string> = {
  // Header
  'Enterprise Architecture Management': '企业架构管理',
  'Home': '首页',
  "I'm Reviewer": '我是评审人',
  'Switch Language': '切换语言',
  'User Profile': '用户信息',

  // Sidebar
  'Projects': '项目',
  'EA Review': 'EA评审',
  'Request Summary': '请求汇总',
  'Meetings': '会议',
  'Actions': '行动项',
  'EA Calendar': 'EA日历',
  'Dashboard': '仪表盘',
  'EA Review Dashboard': 'EA评审仪表盘',
  'Total Requests': '总请求数',
  'Pending Review': '待评审',
  'Approved': '已批准',
  'Returned/Rejected': '已退回/拒绝',
  'Avg. Lead Time': '平均周期',
  'creation to completion': '创建到完成',
  'Request Status': '请求状态',
  'Review Result': '评审结果',
  'Approval Rate': '批准率',
  'By Organization': '按组织',
  'Monthly Trend': '月度趋势',
  'Recent Activity': '最近活动',
  'View all requests': '查看全部请求',
  'Review Scope Distribution': '评审范围分布',
  'Last updated': '最后更新',
  'Completed': '已完成',
  'Completed Review Results': '已完成评审结果',
  'Monthly Request Trends': '月度请求趋势',
  'Monthly Avg. Lead Time (days)': '月度平均周期（天）',
  'Monthly by Organization': '月度按组织',
  'Certification': '认证',
  'Application Management': '应用管理',
  'Business Capability Mapping': '业务能力映射',
  'Business Capability Analysis': '业务能力分析',
  'BCPF Master Data': 'BCPF主数据',
  'Technology Stack': '技术栈',
  'Lifecycle Management': '生命周期管理',
  'Technology Stack Master Data': '技术栈主数据',
  'Resources': '资源',
  'Master Data': '主数据',
  'Data Privacy': '数据隐私',
  'Platform Engineering': '平台工程',
  'Reports': '报表',
  'Email Sending Log': '邮件发送日志',
  'Lead Time Report': '周期报表',
  'Settings': '设置',
  'Audit Log': '审计日志',
  'BigEA Team Members': 'BigEA团队成员',
  'Scope Check List Template': '范围检查清单模板',
  'Scope of Change Template': '变更范围模板',
  'Help': '帮助',

  // Common buttons
  'Search': '搜索',
  'Reset': '重置',
  'Export': '导出',
  'Create': '创建',
  'Save': '保存',
  'Cancel': '取消',
  'Delete': '删除',
  'Edit': '编辑',
  'Submit': '提交',
  'Back': '返回',
  'Confirm': '确认',
  'Close': '关闭',

  // Pagination
  'Total': '共',
  'items': '条',
  'Page': '页',
  'items per page': '条/页',

  // SearchForm labels
  'Project': '项目',
  'Request ID/Name': '请求ID/名称',
  'Review Scope': '评审范围',
  'PM': 'PM',
  'EA Review Result': 'EA评审结果',
  'Organization': '组织',
  'Requestor': '请求人',
  'Assigned Reviewer': '指定评审人',
  'Action Title': '行动标题',
  'Action ID': '行动ID',
  'Assignee Name': '负责人',
  'Status': '状态',
  'Created By': '创建人',
  'Created By(IT Code)': '创建人(IT Code)',
  'Created At From-To': '创建时间范围',
  'Requested By': '请求人',
  'Meeting Title': '会议标题',
  'Meeting Agent': '会议代理',
  'EV Review': 'EV评审',
  'Created Date': '创建日期',
  'Project ID': '项目ID',

  // Table headers
  'Request ID': '请求ID',
  'Project Name': '项目名称',
  'WS Name / Phase Name': 'WS名称 / 阶段名称',
  'DT Lead': 'DT负责人',
  'Changed By': '修改人',
  'Changed At': '修改时间',
  'Created At': '创建时间',
  'Action Status': '行动状态',
  'Action Expiration': '行动到期',
  'Request Name': '请求名称',
  'Type': '类型',
  'Close Date': '关闭日期',
  'Due Date': '到期日',
  'Assignee(s)': '负责人',
  'Applicable Domain': '适用领域',
  'Meeting No.': '会议编号',
  'Start Time': '开始时间',
  'End Time': '结束时间',
  'Scope': '范围',
  'Reviewer': '评审人',

  // Home page
  'Create A Request': '创建请求',
  'My Projects': '我的项目',
  'My Requests': '我的请求',
  'My Actions': '我的行动项',
  'Request Queue': '请求队列',
  'View All': '查看全部',
  'Recommend Links': '推荐链接',

  // Status values
  'Draft': '草稿',
  'Submitted': '已提交',
  'In Progress': '进行中',
  'Approved with Actions': '有条件通过',
  'Rejected': '已拒绝',
  'Accepted by EA': 'EA已接受',
  'Returned by EA': 'EA已退回',
  'Open': '待处理',
  'In Validation': '验证中',
  'Closed': '已关闭',
  'Available': '可用',
  'Booked': '已预订',

  // DataTable
  'Column Settings': '列设置',
  'No data available': '暂无数据',
  'Loading...': '加载中...',

  // Lead Time Report
  'Overall Status': '总体状态',
  'Draft Time': '草稿时间',
  'In Progress Time': '进行中时间',
  'Completed Time': '完成时间',
  'Total Lead Time(Days)': '总周期(天)',

  // Business Capability Analysis
  'Capability Mindmap': '能力思维导图',
  'Applications': '应用',
  'Capabilities': '能力',
  'capabilities': '个能力',
  'applications': '个应用',
  'mappings': '个映射',
  'Total Applications': '应用总数',
  'Active': '活跃',
  'Planned': '已规划',
  'Total Mappings': '映射总数',
  'Total Capabilities (L3)': 'L3能力总数',
  'Covered': '已覆盖',
  'Coverage Rate': '覆盖率',
  'Unique Applications': '独立应用数',
  'All Domains': '全部领域',
  'Highlight multi-app capabilities': '高亮多应用能力',
  'No applications mapped': '暂无应用映射',
  'Search applications...': '搜索应用...',

  // Misc
  'Expand Sidebar': '展开侧栏',
  'Collapse Sidebar': '收起侧栏',
  'All': '全部',
  'Columns': '列',
  'IT PMO': 'IT PMO',
  'LSSC': 'LSSC',
  'IT Service Portal': 'IT服务门户',
  'Enterprise Architecture': '企业架构',
};

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    const saved = localStorage.getItem('eam-locale') as Locale;
    if (saved === 'en' || saved === 'zh') {
      setLocale(saved);
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale((prev) => {
      const next = prev === 'en' ? 'zh' : 'en';
      localStorage.setItem('eam-locale', next);
      return next;
    });
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, toggleLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

/**
 * Returns a translation function `t(text)`.
 * In 'en' mode returns the text as-is; in 'zh' mode looks up the dictionary.
 */
export function useT() {
  const { locale } = useLocale();
  return useCallback(
    (text: string): string => {
      if (locale === 'en') return text;
      return zhDict[text] ?? text;
    },
    [locale]
  );
}
