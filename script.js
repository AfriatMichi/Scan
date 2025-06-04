// Initialize variables
let borrowScanner = null;
let returnScanner = null;
let robes = [];

// DOM Elements
const startBorrowScanBtn = document.getElementById('startBorrowScan');
const startReturnScanBtn = document.getElementById('startReturnScan');
const closeBorrowScanBtn = document.getElementById('closeBorrowScan');
const closeReturnScanBtn = document.getElementById('closeReturnScan');
const exportCSVBtn = document.getElementById('exportCSV');
const exportTXTBtn = document.getElementById('exportTXT');
const historyTable = document.getElementById('historyTable').getElementsByTagName('tbody')[0];

// Wait for Firebase to be ready
function waitForFirebase() {
    return new Promise((resolve) => {
        const checkFirebase = () => {
            if (window.firebaseFunctions && window.db) {
                resolve();
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
}

// Load data from Firebase
async function loadData() {
    try {
        await waitForFirebase();
        const { collection, getDocs } = window.firebaseFunctions;
        const querySnapshot = await getDocs(collection(window.db, "robes"));
        robes = [];
        querySnapshot.forEach((doc) => {
            robes.push({ 
                firebaseId: doc.id,  // שמירת ה-ID של Firebase בנפרד
                ...doc.data() 
            });
        });
        updateStats();
        updateHistoryTable();
    } catch (error) {
        console.error("Error loading data:", error);
        alert("שגיאה בטעינת הנתונים. אנא רענן את הדף.");
    }
}

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
        row.insertCell(0).textContent = robe.robeId;  // שימוש במספר הגלימה האמיתי
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
async function onBorrowScanSuccess(decodedText) {
    const robeId = decodedText.trim();
    const existingRobe = robes.find(r => r.robeId === robeId);  // חיפוש לפי מספר הגלימה

    if (existingRobe) {
        alert('גלימה זו כבר מושאלת!');
    } else {
        try {
            await waitForFirebase();
            const { collection, addDoc } = window.firebaseFunctions;
            // Add new robe to Firebase
            const docRef = await addDoc(collection(window.db, "robes"), {
                robeId: robeId,  // שמירת מספר הגלימה
                borrowDate: new Date().toISOString(),
                returnDate: null,
                status: 'borrowed'
            });

            // Update local data
            robes.push({
                firebaseId: docRef.id,  // שמירת ה-ID של Firebase
                robeId: robeId,  // שמירת מספר הגלימה
                borrowDate: new Date().toISOString(),
                returnDate: null,
                status: 'borrowed'
            });

            // Update UI
            updateStats();
            updateHistoryTable();
            
            // Stop scanner after successful scan
            if (borrowScanner) {
                borrowScanner.stop().then(() => {
                    borrowScanner = null;
                    closeBorrowScanBtn.style.display = 'none';
                }).catch(err => {
                    console.error("Error stopping scanner:", err);
                });
            }
        } catch (error) {
            console.error("Error adding robe:", error);
            alert("שגיאה בשמירת הנתונים. אנא נסה שוב.");
        }
    }
}

// Handle QR code scan for returning
async function onReturnScanSuccess(decodedText) {
    const robeId = decodedText.trim();
    const existingRobe = robes.find(r => r.robeId === robeId);  // חיפוש לפי מספר הגלימה

    if (!existingRobe) {
        alert('גלימה זו לא מושאלת!');
    } else if (existingRobe.status === 'returned') {
        alert('גלימה זו כבר הוחזרה!');
    } else {
        try {
            await waitForFirebase();
            const { doc, updateDoc } = window.firebaseFunctions;
            // Update robe in Firebase
            const robeRef = doc(window.db, "robes", existingRobe.firebaseId);  // שימוש ב-ID של Firebase
            await updateDoc(robeRef, {
                status: 'returned',
                returnDate: new Date().toISOString()
            });

            // Update local data
            existingRobe.status = 'returned';
            existingRobe.returnDate = new Date().toISOString();

            // Update UI
            updateStats();
            updateHistoryTable();
            
            // Stop scanner after successful scan
            if (returnScanner) {
                returnScanner.stop().then(() => {
                    returnScanner = null;
                    closeReturnScanBtn.style.display = 'none';
                }).catch(err => {
                    console.error("Error stopping scanner:", err);
                });
            }
        } catch (error) {
            console.error("Error updating robe:", error);
            alert("שגיאה בעדכון הנתונים. אנא נסה שוב.");
        }
    }
}

// Initialize QR Scanner
async function initBorrowScanner() {
    try {
        if (!borrowScanner) {
            borrowScanner = new Html5Qrcode("borrowReader");
        }
        closeBorrowScanBtn.style.display = 'flex';
        return true;
    } catch (err) {
        console.error("Error initializing borrow scanner:", err);
        alert("שגיאה באתחול המצלמה. אנא נסה שוב.");
        return false;
    }
}

async function initReturnScanner() {
    try {
        if (!returnScanner) {
            returnScanner = new Html5Qrcode("returnReader");
        }
        closeReturnScanBtn.style.display = 'flex';
        return true;
    } catch (err) {
        console.error("Error initializing return scanner:", err);
        alert("שגיאה באתחול המצלמה. אנא נסה שוב.");
        return false;
    }
}

// Start scanning for borrowing
startBorrowScanBtn.addEventListener('click', async () => {
    try {
        const initialized = await initBorrowScanner();
        if (!initialized) return;

        await borrowScanner.start(
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
    } catch (err) {
        console.error("Error starting borrow scanner:", err);
        alert("שגיאה בהפעלת המצלמה. אנא נסה שוב.");
    }
});

// Start scanning for returning
startReturnScanBtn.addEventListener('click', async () => {
    try {
        const initialized = await initReturnScanner();
        if (!initialized) return;

        await returnScanner.start(
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
    } catch (err) {
        console.error("Error starting return scanner:", err);
        alert("שגיאה בהפעלת המצלמה. אנא נסה שוב.");
    }
});

// Close scanning for borrowing
closeBorrowScanBtn.addEventListener('click', async () => {
    if (borrowScanner) {
        try {
            await borrowScanner.stop();
            borrowScanner = null;
            closeBorrowScanBtn.style.display = 'none';
        } catch (err) {
            console.error("Error stopping borrow scanner:", err);
        }
    }
});

// Close scanning for returning
closeReturnScanBtn.addEventListener('click', async () => {
    if (returnScanner) {
        try {
            await returnScanner.stop();
            returnScanner = null;
            closeReturnScanBtn.style.display = 'none';
        } catch (err) {
            console.error("Error stopping return scanner:", err);
        }
    }
});

// Export to CSV
exportCSVBtn.addEventListener('click', () => {
    const headers = ['מספר גלימה', 'תאריך השאלה', 'תאריך החזרה', 'סטטוס'];
    const csvContent = [
        headers.join(','),
        ...robes.map(robe => [
            robe.robeId,  // שימוש במספר הגלימה האמיתי
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
        `מספר גלימה: ${robe.robeId}  // שימוש במספר הגלימה האמיתי
תאריך השאלה: ${new Date(robe.borrowDate).toLocaleString('he-IL')}
תאריך החזרה: ${robe.returnDate ? new Date(robe.returnDate).toLocaleString('he-IL') : '-'}
סטטוס: ${getStatusText(robe.status)}
-------------------`
    ).join('\n\n');

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, 'robes_history.txt');
});

// Initialize the application
loadData(); 