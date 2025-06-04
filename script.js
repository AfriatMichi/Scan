// Initialize variables
let borrowScanner = null;
let returnScanner = null;
let robes = JSON.parse(localStorage.getItem('robes')) || [];

// DOM Elements
const startBorrowScanBtn = document.getElementById('startBorrowScan');
const stopBorrowScanBtn = document.getElementById('stopBorrowScan');
const startReturnScanBtn = document.getElementById('startReturnScan');
const stopReturnScanBtn = document.getElementById('stopReturnScan');
const exportCSVBtn = document.getElementById('exportCSV');
const exportTXTBtn = document.getElementById('exportTXT');
const historyTable = document.getElementById('historyTable').getElementsByTagName('tbody')[0];

// Update statistics
function updateStats() {
    const borrowed = robes.filter(robe => robe.status === 'borrowed').length;
    const returned = robes.filter(robe => robe.status === 'returned').length;
    const notReturned = robes.filter(robe => robe.status === 'not_returned').length;

    document.getElementById('borrowedCount').textContent = borrowed;
    document.getElementById('returnedCount').textContent = returned;
    document.getElementById('notReturnedCount').textContent = notReturned;
}

// Update history table
function updateHistoryTable() {
    historyTable.innerHTML = '';
    robes.forEach(robe => {
        const row = historyTable.insertRow();
        row.insertCell(0).textContent = robe.id;
        row.insertCell(1).textContent = new Date(robe.borrowDate).toLocaleString('he-IL');
        row.insertCell(2).textContent = robe.returnDate ? new Date(robe.returnDate).toLocaleString('he-IL') : '-';
        row.insertCell(3).textContent = getStatusText(robe.status);
    });
}

// Get status text in Hebrew
function getStatusText(status) {
    const statusMap = {
        'borrowed': 'מושאל',
        'returned': 'הוחזר',
        'not_returned': 'לא הוחזר'
    };
    return statusMap[status] || status;
}

// Handle QR code scan for borrowing
function onBorrowScanSuccess(decodedText) {
    const robeId = decodedText.trim();
    const existingRobe = robes.find(r => r.id === robeId);

    if (existingRobe) {
        alert('גלימה זו כבר מושאלת!');
    } else {
        // Borrow new robe
        robes.push({
            id: robeId,
            borrowDate: new Date().toISOString(),
            returnDate: null,
            status: 'borrowed'
        });

        // Save to localStorage and update UI
        localStorage.setItem('robes', JSON.stringify(robes));
        updateStats();
        updateHistoryTable();
        
        // Stop scanner after successful scan
        if (borrowScanner) {
            borrowScanner.stop();
        }
    }
}

// Handle QR code scan for returning
function onReturnScanSuccess(decodedText) {
    const robeId = decodedText.trim();
    const existingRobe = robes.find(r => r.id === robeId);

    if (!existingRobe) {
        alert('גלימה זו לא מושאלת!');
    } else if (existingRobe.status === 'returned') {
        alert('גלימה זו כבר הוחזרה!');
    } else {
        // Return robe
        existingRobe.status = 'returned';
        existingRobe.returnDate = new Date().toISOString();

        // Save to localStorage and update UI
        localStorage.setItem('robes', JSON.stringify(robes));
        updateStats();
        updateHistoryTable();
        
        // Stop scanner after successful scan
        if (returnScanner) {
            returnScanner.stop();
        }
    }
}

// Initialize QR Scanner
function initBorrowScanner() {
    if (!borrowScanner) {
        borrowScanner = new Html5Qrcode("borrowReader");
    }
}

function initReturnScanner() {
    if (!returnScanner) {
        returnScanner = new Html5Qrcode("returnReader");
    }
}

// Start scanning for borrowing
startBorrowScanBtn.addEventListener('click', () => {
    initBorrowScanner();
    
    borrowScanner.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        onBorrowScanSuccess,
        (error) => {
            // Ignore errors
        }
    );
});

// Start scanning for returning
startReturnScanBtn.addEventListener('click', () => {
    initReturnScanner();
    
    returnScanner.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        onReturnScanSuccess,
        (error) => {
            // Ignore errors
        }
    );
});

// Stop scanning
stopBorrowScanBtn.addEventListener('click', () => {
    if (borrowScanner) {
        borrowScanner.stop();
    }
});

stopReturnScanBtn.addEventListener('click', () => {
    if (returnScanner) {
        returnScanner.stop();
    }
});

// Export to CSV
exportCSVBtn.addEventListener('click', () => {
    const headers = ['מספר גלימה', 'תאריך השאלה', 'תאריך החזרה', 'סטטוס'];
    const csvContent = [
        headers.join(','),
        ...robes.map(robe => [
            robe.id,
            new Date(robe.borrowDate).toLocaleString('he-IL'),
            robe.returnDate ? new Date(robe.returnDate).toLocaleString('he-IL') : '-',
            getStatusText(robe.status)
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'robes_history.csv');
});

// Export to TXT
exportTXTBtn.addEventListener('click', () => {
    const txtContent = robes.map(robe => 
        `מספר גלימה: ${robe.id}
תאריך השאלה: ${new Date(robe.borrowDate).toLocaleString('he-IL')}
תאריך החזרה: ${robe.returnDate ? new Date(robe.returnDate).toLocaleString('he-IL') : '-'}
סטטוס: ${getStatusText(robe.status)}
-------------------`
    ).join('\n\n');

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, 'robes_history.txt');
});

// Initialize the application
updateStats();
updateHistoryTable(); 