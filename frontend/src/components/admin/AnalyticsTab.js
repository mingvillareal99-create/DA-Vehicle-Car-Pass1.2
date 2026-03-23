import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Download, BarChart2, PieChart as PieChartIcon, Activity } from "lucide-react";

// Colors for charts
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const AnalyticsTab = ({ logs = [], vehicles = [] }) => {
  const [timeRange, setTimeRange] = useState('7days'); // 'today', '7days', '30days'

  // Filter logs based on selected time range
  const filteredLogs = useMemo(() => {
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case '7days':
        startDate = startOfDay(subDays(now, 7));
        break;
      case '30days':
        startDate = startOfDay(subDays(now, 30));
        break;
      default:
        startDate = startOfDay(subDays(now, 7));
    }

    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return isWithinInterval(logDate, { start: startDate, end: now });
    });
  }, [logs, timeRange]);

  // Aggregate data for Activity Timeline (Entries vs Exits per day)
  const activityData = useMemo(() => {
    const dataMap = {};
    
    // Initialize map with dates in range to ensure continuous timeline
    const now = new Date();
    let daysToGenerate = timeRange === 'today' ? 1 : (timeRange === '7days' ? 7 : 30);
    
    // For 'today', group by hour instead of day
    if (timeRange === 'today') {
        for (let i = 0; i < 24; i++) {
            const hourStr = `${i.toString().padStart(2, '0')}:00`;
            dataMap[hourStr] = { time: hourStr, entries: 0, exits: 0 };
        }
        
        filteredLogs.forEach(log => {
            const date = new Date(log.timestamp);
            const hourStr = `${date.getHours().toString().padStart(2, '0')}:00`;
            if (dataMap[hourStr]) {
                if (log.action === 'entry') dataMap[hourStr].entries++;
                else if (log.action === 'exit') dataMap[hourStr].exits++;
            }
        });
    } else {
        // Group by day
        for (let i = daysToGenerate - 1; i >= 0; i--) {
            const d = subDays(now, i);
            const dateStr = format(d, 'MMM dd');
            dataMap[dateStr] = { time: dateStr, entries: 0, exits: 0 };
        }
        
        filteredLogs.forEach(log => {
            const dateStr = format(new Date(log.timestamp), 'MMM dd');
            if (dataMap[dateStr]) {
                if (log.action === 'entry') dataMap[dateStr].entries++;
                else if (log.action === 'exit') dataMap[dateStr].exits++;
            }
        });
    }

    return Object.values(dataMap);
  }, [filteredLogs, timeRange]);

  // Aggregate data for Vehicle Types
  const vehicleTypeData = useMemo(() => {
    const typeCount = { da_government: 0, government: 0, public: 0, private: 0, visitor: 0 };
    
    // We use entries to count unique visits by type in the period
    const entries = filteredLogs.filter(log => log.action === 'entry');
    
    entries.forEach(log => {
      // Find registration type or infer from vehicles list
      if (log.registration_type === 'visitor') {
        typeCount.visitor++;
      } else {
        const registered = vehicles.find(v => v.plate_number === log.plate_number);
        if (registered) {
           if (registered.vehicle_type === 'da_government') typeCount.da_government++;
           else if (registered.vehicle_type === 'government') typeCount.government++;
           else if (registered.vehicle_type === 'public') typeCount.public++;
           else typeCount.private++;
        } else {
            // Default to private if unknown (though shouldn't happen usually)
            typeCount.private++;
        }
      }
    });

    return [
      { name: 'DA Government', value: typeCount.da_government },
      { name: 'Government', value: typeCount.government },
      { name: 'Public', value: typeCount.public },
      { name: 'Private', value: typeCount.private },
      { name: 'Visitor', value: typeCount.visitor }
    ].filter(item => item.value > 0);
  }, [filteredLogs, vehicles]);

  // Aggregate data for Scan Methods
  const scanMethodData = useMemo(() => {
    const counts = {};
    filteredLogs.forEach(log => {
        counts[log.scan_method] = (counts[log.scan_method] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
        name: key.toUpperCase(),
        value: counts[key]
    }));
  }, [filteredLogs]);


  // Key Metrics
  const totalTransactions = filteredLogs.length;
  const totalEntries = filteredLogs.filter(l => l.action === 'entry').length;
  const totalExits = filteredLogs.filter(l => l.action === 'exit').length;
  const uniqueVehicles = new Set(filteredLogs.map(l => l.plate_number)).size;

  /**
   * Export Data to Excel
   */
  const handleExport = () => {
    try {
        // 1. Prepare Summary Data
        const summaryData = [
            { Metric: "Time Range", Value: timeRange === 'today' ? 'Today' : (timeRange === '7days' ? 'Last 7 Days' : 'Last 30 Days') },
            { Metric: "Total Transactions", Value: totalTransactions },
            { Metric: "Total Entries", Value: totalEntries },
            { Metric: "Total Exits", Value: totalExits },
            { Metric: "Unique Vehicles", Value: uniqueVehicles },
        ];

        // 2. Prepare Detailed Log Data
        const logData = filteredLogs.map(log => ({
            'Date & Time': format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
            'Action': log.action.toUpperCase(),
            'Plate Number': log.plate_number,
            'Registration Type': log.registration_type ? log.registration_type.toUpperCase() : 'REGISTERED',
            'Scan Method': log.scan_method,
            'Guard on Duty': log.guard_username
        }));

        // Create workbook and worksheets
        const wb = XLSX.utils.book_new();
        
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, "Summary Metrics");

        const wsLogs = XLSX.utils.json_to_sheet(logData);
        XLSX.utils.book_append_sheet(wb, wsLogs, "Transaction Logs");

        // Format column widths for Logs sheet
        const wscols = [
            {wch: 20}, // Date & Time
            {wch: 10}, // Action
            {wch: 15}, // Plate Number
            {wch: 20}, // Reg Type
            {wch: 15}, // Scan Method
            {wch: 20}, // Guard
        ];
        wsLogs['!cols'] = wscols;

        // Generate Excel file and save
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        
        const fileName = `Vehicle_Gate_Pass_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        saveAs(data, fileName);
    } catch (error) {
        console.error("Error exporting to Excel:", error);
        alert("Failed to export report. See console for details.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <BarChart2 className="w-5 h-5 mr-2 text-green-600" />
            Analytics & Reports
          </h2>
          <p className="text-sm text-gray-500">View transaction statistics and download customized Excel reports.</p>
        </div>
        
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Actions</p>
              <h3 className="text-2xl font-bold text-gray-900">{totalTransactions}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-full">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Entries</p>
              <h3 className="text-2xl font-bold text-gray-900">{totalEntries}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
             <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Exits</p>
              <h3 className="text-2xl font-bold text-gray-900">{totalExits}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17zm11-5v-2a4 4 0 00-3-3.87m-4-1V4a1 1 0 00-1-1H3a1 1 0 00-1 1v14a1 1 0 001 1h14a1 1 0 001-1v-2" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Unique Vehicles</p>
              <h3 className="text-2xl font-bold text-gray-900">{uniqueVehicles}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-md">Entry/Exit Activity</CardTitle>
            <CardDescription>
                {timeRange === 'today' ? 'Hourly transactions for today' : 'Daily transactions over the selected period'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dx={-10} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line type="monotone" dataKey="entries" name="Entries" stroke="#10b981" strokeWidth={3} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="exits" name="Exits" stroke="#ef4444" strokeWidth={3} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Charts */}
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-md flex items-center">
                        <PieChartIcon className="w-4 h-4 mr-2 text-gray-500" />
                        Vehicle Types (Entries)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[200px] w-full">
                    {vehicleTypeData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                            <Pie
                                data={vehicleTypeData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={70}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {vehicleTypeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip />
                            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data available</div>
                    )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-md flex items-center">
                        <PieChartIcon className="w-4 h-4 mr-2 text-gray-500" />
                        Scan Methods
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[200px] w-full">
                    {scanMethodData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={scanMethodData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={80} />
                                <RechartsTooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                                    {scanMethodData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                         <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data available</div>
                    )}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>

    </div>
  );
};

export default AnalyticsTab;
