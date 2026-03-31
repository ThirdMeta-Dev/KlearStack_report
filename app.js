import salesData from './data.js';

document.addEventListener('DOMContentLoaded', () => {
    const tableHead = document.getElementById('table-head');
    const tableBody = document.getElementById('table-body');
    const currentTabTitle = document.getElementById('current-tab-title');
    const navLinks = document.querySelectorAll('.nav-link');
    const downloadBtn = document.getElementById('download-pdf');
    const filterConverted = document.getElementById('filter-converted');

    // Initialize Metrics
    document.getElementById('total-leads').textContent = salesData.Metrics["Total Leads"];
    document.getElementById('in-funnel').textContent = salesData.Metrics["In Funnel"];
    document.getElementById('converted').textContent = salesData.Metrics["Converted"];
    document.getElementById('conversion-rate').textContent = salesData.Metrics["Conversion Rate"];

    let currentTab = 'In Funnel';

    const renderTable = (tabName, filterConvertedOnly = false) => {
        const data = salesData[tabName];
        if (!data || data.length === 0) return;

        // Reset Table
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';
        currentTabTitle.textContent = tabName;

        // Get Headers from keys of first object
        const headers = Object.keys(data[0]);
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header.charAt(0).toUpperCase() + header.slice(1);
            tableHead.appendChild(th);
        });

        // Filter Data
        const filteredData = filterConvertedOnly 
            ? data.filter(item => item.converted === "Yes" || item.status.toLowerCase().includes('converted'))
            : data;

        // Render Rows
        filteredData.forEach(item => {
            const tr = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                // Apply styling to specific statuses
                if (header === 'status') {
                    const statusVal = item[header].toLowerCase();
                    if (statusVal.includes('closed') || statusVal.includes('lost')) {
                        td.innerHTML = `<span class="danger">${item[header]}</span>`;
                    } else if (statusVal.includes('won') || statusVal.includes('converted')) {
                        td.innerHTML = `<span class="success">${item[header]}</span>`;
                    } else {
                        td.textContent = item[header];
                    }
                } else {
                    td.textContent = item[header];
                }
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });
    };

    // Initial Render
    renderTable(currentTab);

    // Tab Switching
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            navLinks.forEach(nl => nl.classList.remove('active'));
            e.target.classList.add('active');
            currentTab = e.target.getAttribute('data-tab');
            renderTable(currentTab, filterConverted.checked);
        });
    });

    // Filter Converted
    filterConverted.addEventListener('change', () => {
        renderTable(currentTab, filterConverted.checked);
    });

    // PDF Download
    downloadBtn.addEventListener('click', () => {
        const element = document.getElementById('report-content');
        const opt = {
            margin:       0.5,
            filename:     'KlearStack_Sales_Report.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
        };

        // Explicitly styled for PDF if needed
        downloadBtn.style.display = 'none'; // Hide button in PDF
        
        html2pdf().set(opt).from(element).save().then(() => {
            downloadBtn.style.display = 'block';
        });
    });
});
