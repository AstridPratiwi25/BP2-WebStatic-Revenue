// Data Simulasi Transaksi Multi-Channel OTA untuk 1 Hotel (Grand Luxury Hotel)
const bookingData = [
    { id: "BK-901", channel: "Traveloka", otaClass: "ota-traveloka", room: "Deluxe Ocean View", nights: 3, price: 4500000, status: "confirmed" },
    { id: "BK-902", channel: "Tiket.com", otaClass: "ota-tiket", room: "Grand Deluxe King", nights: 2, price: 3200000, status: "confirmed" },
    { id: "BK-903", channel: "Agoda", otaClass: "ota-agoda", room: "Superior Room", nights: 1, price: 1200000, status: "confirmed" },
    { id: "BK-904", channel: "Booking.com", otaClass: "ota-booking", room: "Executive Suite", nights: 2, price: 5000000, status: "confirmed" },
    { id: "BK-905", channel: "Expedia", otaClass: "ota-expedia", room: "Deluxe Ocean View", nights: 2, price: 3000000, status: "cancelled" },
    { id: "BK-906", channel: "Trip.com", otaClass: "ota-trip", room: "Superior Room", nights: 4, price: 4800000, status: "confirmed" },
    { id: "BK-907", channel: "Direct Website", otaClass: "ota-website", room: "Presidential Suite", nights: 2, price: 8500000, status: "confirmed" },
    { id: "BK-908", channel: "Traveloka", otaClass: "ota-traveloka", room: "Superior Room", nights: 1, price: 1200000, status: "pending" }
];

// Helper Format Rupiah
function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(number);
}

// Render Data Dashboard
function renderDashboard() {
    const tableBody = document.getElementById('bookingTableBody');
    tableBody.innerHTML = '';

    let totalRev = 0;
    let totalNights = 0;
    let validBookingsCount = 0;
    const channelRevenue = {};

    bookingData.forEach(item => {
        if (item.status !== 'cancelled') {
            totalRev += item.price;
            totalNights += item.nights;
            validBookingsCount++;

            // Hitung revenue per channel
            channelRevenue[item.channel] = (channelRevenue[item.channel] || 0) + item.price;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.id}</strong></td>
            <td><span class="channel-badge ${item.otaClass}">${item.channel}</span></td>
            <td>${item.room}</td>
            <td>${item.nights} Malam</td>
            <td>${formatRupiah(item.price)}</td>
            <td><span class="badge ${item.status}">${item.status.toUpperCase()}</span></td>
        `;
        tableBody.appendChild(row);
    });

    // Cari Top Channel
    let topChannelName = "-";
    let maxRev = 0;
    for (const [channel, rev] of Object.entries(channelRevenue)) {
        if (rev > maxRev) {
            maxRev = rev;
            topChannelName = channel;
        }
    }

    // Hitung Metrics
    const adr = validBookingsCount > 0 ? (totalRev / totalNights) : 0;

    // Update Kartu KPI
    document.getElementById('totalRevenue').innerText = formatRupiah(totalRev);
    document.getElementById('roomNights').innerText = totalNights + " Room Nights";
    document.getElementById('adrValue').innerText = formatRupiah(adr);
    document.getElementById('topChannel').innerText = topChannelName;
}

// Button Sync/Refresh Event
document.getElementById('btnRefresh').addEventListener('click', () => {
    alert('🔄 Sinkronisasi data reservasi Grand Luxury Hotel dengan seluruh OTA berhasil!');
    renderDashboard();
});

// Jalankan awal
document.addEventListener('DOMContentLoaded', renderDashboard);