import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import {
  FileText,
  Download,
  Calendar,
  BarChart3,
  TrendingUp,
  IndianRupee,
  Users,
  Fuel,
  Filter,
  Eye,
} from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

export default function Reports() {
  const { toast } = useToast();
  const [selectedReportType, setSelectedReportType] = useState('Daily Sales Report');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('PDF');

  // Helper function to generate CSV content
  const generateCSV = (reportType: string) => {
    let csvContent = '';
    
    if (reportType.includes('Daily Sales')) {
      csvContent = 'Date,Fuel Type,Opening,Sales,Closing,Rate,Amount\n';
      csvContent += '08-Jan-2024,Petrol,5000,1234,3766,102.50,126485\n';
      csvContent += '08-Jan-2024,Diesel,8000,2156,5844,89.75,193545\n';
      csvContent += '08-Jan-2024,Premium,2000,456,1544,115.20,52531\n';
      csvContent += '\nTotal Collection:,372561\n';
    } else if (reportType.includes('Monthly')) {
      csvContent = 'Month,Total Sales,Total Expenses,Net Profit,Growth\n';
      csvContent += 'December 2023,₹12,45,680,₹4,23,150,₹8,22,530,+12.5%\n';
    } else if (reportType.includes('Inventory')) {
      csvContent = 'Tank,Fuel Type,Capacity,Current Stock,Status\n';
      csvContent += 'Tank 1,Petrol,10000L,7850L,Good\n';
      csvContent += 'Tank 2,Diesel,15000L,12340L,Good\n';
      csvContent += 'Tank 3,Premium,8000L,2100L,Low\n';
    } else if (reportType.includes('Employee')) {
      csvContent = 'Employee,Role,Attendance,Working Days,Salary\n';
      csvContent += 'Rajesh Kumar,Operator,95%,29,₹25000\n';
      csvContent += 'Priya Sharma,Cashier,98%,30,₹22000\n';
      csvContent += 'Amit Patel,Supervisor,100%,31,₹35000\n';
    } else {
      csvContent = 'Report Type,Date,Value\n';
      csvContent += `${reportType},${new Date().toLocaleDateString()},Sample Data\n`;
    }
    
    return csvContent;
  };

  // Helper function to generate Excel workbook
  const generateExcelWorkbook = (reportType: string) => {
    let data: any[] = [];
    
    if (reportType.includes('Daily Sales')) {
      data = [
        ['Petrol Bunk Management System - Daily Sales Report'],
        ['Generated on: ' + new Date().toLocaleDateString('en-IN')],
        [],
        ['Fuel Type', 'Opening (L)', 'Sales (L)', 'Closing (L)', 'Rate (₹)', 'Amount (₹)'],
        ['Petrol', 5000, 1234, 3766, 102.50, 126485],
        ['Diesel', 8000, 2156, 5844, 89.75, 193545],
        ['Premium', 2000, 456, 1544, 115.20, 52531],
        [],
        ['Total Collection', '', '', '', '', 372561],
      ];
    } else if (reportType.includes('Monthly')) {
      data = [
        ['Petrol Bunk Management System - Monthly Summary'],
        ['Generated on: ' + new Date().toLocaleDateString('en-IN')],
        [],
        ['Metric', 'Value'],
        ['Total Sales', '₹12,45,680'],
        ['Total Expenses', '₹4,23,150'],
        ['Net Profit', '₹8,22,530'],
        ['Growth vs Previous Month', '+12.5%'],
      ];
    } else if (reportType.includes('Inventory')) {
      data = [
        ['Petrol Bunk Management System - Inventory Report'],
        ['Generated on: ' + new Date().toLocaleDateString('en-IN')],
        [],
        ['Tank', 'Fuel Type', 'Capacity', 'Current Stock', 'Status'],
        ['Tank 1', 'Petrol', '10,000 L', '7,850 L', 'Good'],
        ['Tank 2', 'Diesel', '15,000 L', '12,340 L', 'Good'],
        ['Tank 3', 'Premium', '8,000 L', '2,100 L', 'Low Stock'],
      ];
    } else if (reportType.includes('Employee')) {
      data = [
        ['Petrol Bunk Management System - Employee Report'],
        ['Generated on: ' + new Date().toLocaleDateString('en-IN')],
        [],
        ['Employee', 'Role', 'Attendance', 'Working Days', 'Salary'],
        ['Rajesh Kumar', 'Operator', '95%', '29/31', '₹25,000'],
        ['Priya Sharma', 'Cashier', '98%', '30/31', '₹22,000'],
        ['Amit Patel', 'Supervisor', '100%', '31/31', '₹35,000'],
      ];
    } else {
      data = [
        ['Petrol Bunk Management System'],
        [reportType],
        ['Generated on: ' + new Date().toLocaleDateString('en-IN')],
      ];
    }
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    
    return wb;
  };

  // Helper function to generate PDF
  const generatePDF = (reportType: string) => {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString('en-IN');
    
    // Header
    doc.setFontSize(16);
    doc.text('Petrol Bunk Management System', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(reportType, 105, 30, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Generated on: ${currentDate}`, 105, 38, { align: 'center' });
    
    let yPos = 50;
    
    if (reportType.includes('Daily Sales')) {
      doc.setFontSize(11);
      doc.text('Daily Sales Report', 14, yPos);
      yPos += 10;
      
      const tableData = [
        ['Fuel Type', 'Opening (L)', 'Sales (L)', 'Closing (L)', 'Rate (₹)', 'Amount (₹)'],
        ['Petrol', '5,000', '1,234', '3,766', '102.50', '1,26,485'],
        ['Diesel', '8,000', '2,156', '5,844', '89.75', '1,93,545'],
        ['Premium', '2,000', '456', '1,544', '115.20', '52,531'],
        ['', '', '', '', 'Total', '₹3,72,561'],
      ];
      
      tableData.forEach((row, index) => {
        let xPos = 14;
        row.forEach((cell, cellIndex) => {
          const cellWidth = index === 0 ? 30 : 30;
          doc.text(cell, xPos, yPos);
          xPos += cellWidth;
        });
        yPos += 8;
      });
    } else if (reportType.includes('Monthly')) {
      doc.setFontSize(11);
      doc.text('Monthly Summary - December 2023', 14, yPos);
      yPos += 10;
      
      const data = [
        ['Metric', 'Value'],
        ['Total Sales', '₹12,45,680'],
        ['Total Expenses', '₹4,23,150'],
        ['Net Profit', '₹8,22,530'],
        ['Growth vs Previous Month', '+12.5%'],
      ];
      
      data.forEach((row) => {
        doc.text(row[0], 14, yPos);
        doc.text(row[1], 100, yPos);
        yPos += 8;
      });
    } else if (reportType.includes('Inventory')) {
      doc.setFontSize(11);
      doc.text('Inventory Report', 14, yPos);
      yPos += 10;
      
      const data = [
        ['Tank', 'Fuel Type', 'Capacity', 'Current Stock', 'Status'],
        ['Tank 1', 'Petrol', '10,000 L', '7,850 L', 'Good'],
        ['Tank 2', 'Diesel', '15,000 L', '12,340 L', 'Good'],
        ['Tank 3', 'Premium', '8,000 L', '2,100 L', 'Low Stock'],
      ];
      
      data.forEach((row) => {
        let xPos = 14;
        row.forEach((cell) => {
          doc.text(cell, xPos, yPos);
          xPos += 38;
        });
        yPos += 8;
      });
    } else if (reportType.includes('Employee')) {
      doc.setFontSize(11);
      doc.text('Employee Report - December 2023', 14, yPos);
      yPos += 10;
      
      const data = [
        ['Employee', 'Role', 'Attendance', 'Days', 'Salary'],
        ['Rajesh Kumar', 'Operator', '95%', '29/31', '₹25,000'],
        ['Priya Sharma', 'Cashier', '98%', '30/31', '₹22,000'],
        ['Amit Patel', 'Supervisor', '100%', '31/31', '₹35,000'],
      ];
      
      data.forEach((row) => {
        let xPos = 14;
        row.forEach((cell) => {
          doc.text(cell, xPos, yPos);
          xPos += 38;
        });
        yPos += 8;
      });
    }
    
    // Footer
    doc.setFontSize(8);
    doc.text('This is a computer-generated report from Petrol Bunk Management System', 105, 280, { align: 'center' });
    
    return doc;
  };

  // Download handler
  const handleDownload = (reportType: string, format: string) => {
    try {
      const sanitizedReportType = reportType.replace(/[^a-zA-Z0-9]/g, '_');
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `${sanitizedReportType}_${dateStr}`;

      if (format === 'CSV') {
        const content = generateCSV(reportType);
        const blob = new Blob([content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else if (format === 'Excel') {
        const wb = generateExcelWorkbook(reportType);
        XLSX.writeFile(wb, `${filename}.xlsx`);
      } else {
        // PDF
        const doc = generatePDF(reportType);
        doc.save(`${filename}.pdf`);
      }

      toast({
        title: "Report Downloaded",
        description: `${reportType} has been downloaded as ${format}.`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "There was an error downloading the report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const reportTypes = [
    {
      id: 'daily-sales',
      title: 'Daily Sales Report (DSR)',
      description: 'Complete daily sales breakdown with fuel-wise collections',
      icon: BarChart3,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
    {
      id: 'monthly-summary',
      title: 'Monthly Summary',
      description: 'Comprehensive monthly performance analysis',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
    {
      id: 'inventory-report',
      title: 'Inventory Report',
      description: 'Stock levels, purchases, and consumption analysis',
      icon: Fuel,
      color: 'text-accent',
      bgColor: 'bg-accent-soft',
    },
    {
      id: 'employee-report',
      title: 'Employee Report',
      description: 'Attendance, salary, and performance metrics',
      icon: Users,
      color: 'text-warning',
      bgColor: 'bg-warning-soft',
    },
    {
      id: 'borrower-ledger',
      title: 'Borrower Ledger',
      description: 'Outstanding amounts and repayment history',
      icon: IndianRupee,
      color: 'text-destructive',
      bgColor: 'bg-destructive-soft',
    },
    {
      id: 'financial-statement',
      title: 'Financial Statement',
      description: 'Profit & loss, cash flow, and expense analysis',
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
  ];

  const recentReports = [
    {
      id: 1,
      name: 'Daily Sales Report - Jan 08, 2024',
      type: 'DSR',
      generatedDate: '2024-01-08 18:30',
      size: '2.4 MB',
      format: 'PDF',
    },
    {
      id: 2,
      name: 'Monthly Summary - December 2023',
      type: 'Monthly',
      generatedDate: '2024-01-01 10:15',
      size: '5.8 MB',
      format: 'PDF',
    },
    {
      id: 3,
      name: 'Inventory Report - Jan 07, 2024',
      type: 'Inventory',
      generatedDate: '2024-01-07 16:45',
      size: '1.2 MB',
      format: 'Excel',
    },
    {
      id: 4,
      name: 'Employee Attendance - Dec 2023',
      type: 'Employee',
      generatedDate: '2023-12-31 14:20',
      size: '890 KB',
      format: 'PDF',
    },
  ];

  const stats = [
    {
      title: 'Reports Generated',
      value: '127',
      change: 'This month',
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary-soft',
    },
    {
      title: 'Average Daily Sales',
      value: '₹48.2K',
      change: '+8.5% vs last month',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
    {
      title: 'Fuel Sold',
      value: '12.5K L',
      change: 'This month',
      icon: Fuel,
      color: 'text-accent',
      bgColor: 'bg-accent-soft',
    },
    {
      title: 'Collection Rate',
      value: '96.8%',
      change: 'Payment success',
      icon: IndianRupee,
      color: 'text-success',
      bgColor: 'bg-success-soft',
    },
  ];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN');
  };

  const getFormatBadge = (format: string) => {
    const colors = {
      PDF: 'bg-destructive-soft text-destructive',
      Excel: 'bg-success-soft text-success',
      CSV: 'bg-primary-soft text-primary',
    };
    return <Badge className={colors[format as keyof typeof colors] || 'bg-muted text-muted-foreground'}>{format}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header: stack on mobile to avoid overlap */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">
            Reports & Analytics
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Generate and download business reports
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end">
          <Button variant="outline" className="w-full sm:w-auto">
            <Filter className="mr-2 h-4 w-4" />
            Filter Reports
          </Button>
          <Button className="btn-gradient-primary w-full sm:w-auto">
            <FileText className="mr-2 h-4 w-4" />
            Custom Report
          </Button>
        </div>
      </div>

      {/* Stats: unchanged, already responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="stat-card hover-lift shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground truncate">{stat.title}</p>
                    <div className="space-y-0.5">
                      <p className="text-base font-bold text-foreground">{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.change}</p>
                    </div>
                  </div>
                  <div className={`${stat.bgColor} p-2 rounded-lg shrink-0`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Report Generator */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generate Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <select 
                className="w-full p-2 border border-border rounded-md bg-background"
                value={selectedReportType}
                onChange={(e) => setSelectedReportType(e.target.value)}
              >
                <option>Daily Sales Report</option>
                <option>Monthly Summary</option>
                <option>Inventory Report</option>
                <option>Employee Report</option>
                <option>Borrower Ledger</option>
                <option>Financial Statement</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-from">From Date</Label>
              <Input 
                id="date-from" 
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">To Date</Label>
              <Input 
                id="date-to" 
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <select 
                className="w-full p-2 border border-border rounded-md bg-background"
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
              >
                <option>PDF</option>
                <option>Excel</option>
                <option>CSV</option>
              </select>
            </div>
            <Button 
              className="w-full btn-gradient-success"
              onClick={() => handleDownload(selectedReportType, selectedFormat)}
            >
              <Download className="mr-2 h-4 w-4" />
              Generate & Download
            </Button>
          </CardContent>
        </Card>

        {/* Report Templates */}
        <Card className="lg:col-span-2 card-gradient">
          <CardHeader>
            <CardTitle>Quick Report Templates</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Stack cards on mobile; ensure text wraps and buttons wrap */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportTypes.map((report) => {
                const Icon = report.icon;
                return (
                  <div
                    key={report.id}
                    className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`${report.bgColor} p-2 rounded-lg shrink-0`}>
                        <Icon className={`h-5 w-5 ${report.color}`} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-semibold text-foreground">{report.title}</h4>
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                        <div className="flex gap-2 mt-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              toast({
                                title: "Preview",
                                description: "Preview feature coming soon!",
                              });
                            }}
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            Preview
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownload(report.title, 'PDF')}
                          >
                            <Download className="mr-1 h-3 w-3" />
                            Generate
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card className="card-gradient">
        <CardHeader>
          {/* Header actions wrap on mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Reports
            </CardTitle>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentReports.map((report) => (
              <div
                key={report.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="bg-primary-soft p-2 rounded-lg shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{report.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Generated on {formatDate(report.generatedDate)} • {report.size}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:self-end">
                  {getFormatBadge(report.format)}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        toast({
                          title: "Preview",
                          description: "Preview feature coming soon!",
                        });
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload(report.name, report.format)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
