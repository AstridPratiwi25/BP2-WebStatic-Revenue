
// ==========================================
// VILLA & SANCTUARY BY ASTRID
// HOTEL REVENUE MANAGEMENT SYSTEM
// ==========================================


// 1. SIMULATION BOOKING DATA

const defaultBookingData = [
    {
        id: "BK-901",
        guest: "Budi Santoso",
        channel: "Traveloka",
        otaClass: "ota-traveloka",
        room: "Deluxe Ocean View",
        nights: 3,
        price: 4500000,
        status: "confirmed",
        bookingDate: "2026-10-01",
        checkInDate: "2026-10-15"
    },
    {
        id: "BK-902",
        guest: "Siti Rahma",
        channel: "Tiket.com",
        otaClass: "ota-tiket",
        room: "Grand Deluxe King",
        nights: 2,
        price: 3200000,
        status: "confirmed",
        bookingDate: "2026-10-03",
        checkInDate: "2026-10-18"
    },
    {
        id: "BK-903",
        guest: "Michael Scott",
        channel: "Agoda",
        otaClass: "ota-agoda",
        room: "Superior Room",
        nights: 1,
        price: 1200000,
        status: "confirmed",
        bookingDate: "2026-10-05",
        checkInDate: "2026-10-20"
    },
    {
        id: "BK-904",
        guest: "Jessica Tan",
        channel: "Booking.com",
        otaClass: "ota-booking",
        room: "Executive Suite",
        nights: 2,
        price: 5000000,
        status: "confirmed",
        bookingDate: "2026-10-10",
        checkInDate: "2026-10-22"
    },
    {
        id: "BK-905",
        guest: "Ahmad Dahlan",
        channel: "Expedia",
        otaClass: "ota-expedia",
        room: "Deluxe Ocean View",
        nights: 2,
        price: 3000000,
        status: "cancelled",
        bookingDate: "2026-10-12",
        checkInDate: "2026-10-25"
    },
    {
        id: "BK-906",
        guest: "David Kim",
        channel: "Trip.com",
        otaClass: "ota-trip",
        room: "Superior Room",
        nights: 4,
        price: 4800000,
        status: "confirmed",
        bookingDate: "2026-10-15",
        checkInDate: "2026-11-02"
    },
    {
        id: "BK-907",
        guest: "Rina Wijaya",
        channel: "Direct Website",
        otaClass: "ota-website",
        room: "Presidential Suite",
        nights: 2,
        price: 8500000,
        status: "confirmed",
        bookingDate: "2026-10-20",
        checkInDate: "2026-11-05"
    },
    {
        id: "BK-908",
        guest: "Eko Prasetyo",
        channel: "Traveloka",
        otaClass: "ota-traveloka",
        room: "Superior Room",
        nights: 1,
        price: 1200000,
        status: "pending",
        bookingDate: "2026-10-25",
        checkInDate: "2026-11-10"
    }
];


const STORAGE_KEY = "revenueTrackerBookings";

function loadBookingData() {
    const savedData = localStorage.getItem(STORAGE_KEY);

    if (savedData) {
        try {
            return JSON.parse(savedData);
        } catch (error) {
            console.error("Failed to load saved bookings:", error);
        }
    }

    return [...defaultBookingData];
}

let bookingData = loadBookingData();

function saveBookingData() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(bookingData)
    );
}

// 2. HELPER FUNCTIONS

function formatRupiah(number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(number);
}

function getElement(id) {
    return document.getElementById(id);
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}


// 3. GLOBAL DASHBOARD FILTER

function getFilteredBookings() {
    const channel = getElement("globalChannelFilter")?.value || "all";
    const dateDimension = getElement("dateDimensionFilter")?.value || "bookingDate";
    const startDate = getElement("startDateFilter")?.value || "";
    const endDate = getElement("endDateFilter")?.value || "";

    return bookingData.filter(booking => {
        const matchesChannel =
            channel === "all" || booking.channel === channel;

        const selectedDate = booking[dateDimension];

        const matchesStartDate =
            !startDate || selectedDate >= startDate;

        const matchesEndDate =
            !endDate || selectedDate <= endDate;

        return (
            matchesChannel &&
            matchesStartDate &&
            matchesEndDate
        );
    });
}


// 4. RENDER MAIN DASHBOARD

function renderAllPages() {
    const filteredBookings = getFilteredBookings();

    let totalRevenue = 0;
    let totalNights = 0;
    let confirmedCount = 0;

    let cancelledCount = 0;
    let pendingCount = 0;

    const channelStats = {};
    const roomStats = {};

    // Calculate booking statistics
    filteredBookings.forEach(item => {
        const roomCount = Number(item.rooms) || 1;

        if (item.status === "cancelled") {
            cancelledCount++;
            return;
        }

        if (item.status === "pending") {
            pendingCount++;
            return;
        }

        if (item.status !== "confirmed") return;

        totalRevenue += item.price;
        totalNights += item.nights * roomCount;
        confirmedCount++;

        // Channel statistics
        if (!channelStats[item.channel]) {
            channelStats[item.channel] = {
                count: 0,
                rooms: 0,
                nights: 0,
                revenue: 0
            };
        }

        channelStats[item.channel].count++;
        channelStats[item.channel].rooms += roomCount;
        channelStats[item.channel].nights += item.nights * roomCount;
        channelStats[item.channel].revenue += item.price;

        // Room statistics
        if (!roomStats[item.room]) {
            roomStats[item.room] = {
                count: 0,
                bookings: 0,
                nights: 0,
                revenue: 0
            };
        }

        roomStats[item.room].count += roomCount;
        roomStats[item.room].bookings++;
        roomStats[item.room].nights += item.nights * roomCount;
        roomStats[item.room].revenue += item.price;
    });


    // Calculate KPIs
    const adr = totalNights > 0
        ? totalRevenue / totalNights
        : 0;

    const cancellationRate = filteredBookings.length > 0
        ? (cancelledCount / filteredBookings.length) * 100
        : 0;


    // 5. OVERVIEW TABLE

    const overviewBody = getElement("bookingTableBody");

    if (overviewBody) {
        overviewBody.innerHTML = "";

        if (filteredBookings.length === 0) {
            overviewBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        No reservations found.
                    </td>
                </tr>
            `;
        } else {
            filteredBookings.forEach(item => {
                overviewBody.innerHTML += `
                    <tr>
                        <td><strong>${item.id}</strong></td>
                        <td>
                            <span class="channel-badge ${item.otaClass}">
                                ${escapeHtml(item.channel)}
                            </span>
                        </td>
                        <td>${escapeHtml(item.room)}</td>
                        <td>${Number(item.rooms) || 1}</td>
                        <td>${item.nights} Nights</td>
                        <td>${formatRupiah(item.price)}</td>
                        <td>
                            <span class="badge ${item.status}">
                                ${item.status.toUpperCase()}
                            </span>
                        </td>
                    </tr>
                `;
            });
        }
    }


    // 6. TOP PERFORMING CHANNEL

    let topChannelName = "-";
    let maxRevenue = 0;

    Object.entries(channelStats).forEach(([channel, data]) => {
        if (data.revenue > maxRevenue) {
            maxRevenue = data.revenue;
            topChannelName = channel;
        }
    });


    // 7. UPDATE KPI CARDS

    const revenueEl = getElement("totalRevenue");
    const nightsEl = getElement("roomNights");
    const adrEl = getElement("adrValue");
    const topChannelEl = getElement("topChannel");

    if (revenueEl) {
        revenueEl.innerText = formatRupiah(totalRevenue);
    }

    if (nightsEl) {
        nightsEl.innerText = totalNights + " Room Nights";
    }

    if (adrEl) {
        adrEl.innerText = formatRupiah(adr);
    }

    if (topChannelEl) {
        topChannelEl.innerText = topChannelName;
    }


    // 8. OTA BREAKDOWN

    const otaBody = getElement("otaBreakdownBody");

    if (otaBody) {
        otaBody.innerHTML = "";

        const channels = Object.entries(channelStats);

        if (channels.length === 0) {
            otaBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        No confirmed booking data available.
                    </td>
                </tr>
            `;
        } else {
            channels.forEach(([channel, data]) => {

                const contribution = totalRevenue > 0
                    ? (data.revenue / totalRevenue) * 100
                    : 0;

                // Demo assumption: 15% commission
                const commission = data.revenue * 0.15;

                otaBody.innerHTML += `
                    <tr>
                        <td><strong>${channel}</strong></td>
                        <td>${data.count} Bookings (${data.rooms} Rooms)</td>
                        <td>${data.nights} Nights</td>
                        <td>${formatRupiah(data.revenue)}</td>
                        <td>${formatRupiah(commission)}</td>
                        <td><strong>${contribution.toFixed(1)}%</strong></td>
                    </tr>
                `;
            });
        }
    }


    // 9. ROOM TYPE ANALYTICS

    const roomBody = getElement("roomTypeAnalyticsBody");

    if (roomBody) {
        roomBody.innerHTML = "";

        const rooms = Object.entries(roomStats);

        if (rooms.length === 0) {
            roomBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-4">
                        No confirmed room data available.
                    </td>
                </tr>
            `;
        } else {
            rooms.forEach(([room, data]) => {

                const roomADR = data.nights > 0
                    ? data.revenue / data.nights
                    : 0;

                roomBody.innerHTML += `
                    <tr>
                        <td><strong>${room}</strong></td>
                        <td>${data.count} Rooms (${data.bookings} Bookings, ${data.nights} Room Nights)</td>
                        <td>${formatRupiah(data.revenue)}</td>
                        <td>${formatRupiah(roomADR)}</td>
                    </tr>
                `;
            });
        }
    }


    // 10. REVPAR

    const revparEl = getElement("revparValue");

    if (revparEl) {
        revparEl.innerText = "N/A";
        revparEl.title =
            "Room inventory data is required to calculate actual RevPAR.";
    }


    // 11. OPTIONAL ADDITIONAL KPI ELEMENTS
    // These update automatically if the elements are added to HTML.

    const bookingCountEl = getElement("bookingCountValue");
    const cancellationCountEl = getElement("cancellationCountValue");
    const cancellationRateEl = getElement("cancellationRateValue");
    const pendingCountEl = getElement("pendingCountValue");

    if (bookingCountEl) {
        bookingCountEl.innerText = confirmedCount;
    }

    if (cancellationCountEl) {
        cancellationCountEl.innerText = cancelledCount;
    }

    if (cancellationRateEl) {
        cancellationRateEl.innerText =
            cancellationRate.toFixed(1) + "%";
    }

    if (pendingCountEl) {
        pendingCountEl.innerText = pendingCount;
    }


    // 12. RESERVATIONS TABLE

    renderReservations();
}


// 13. RESERVATION SEARCH & FILTER

function renderReservations() {

    const resBody = getElement("allReservationsBody");

    if (!resBody) return;

    const searchInput = getElement("searchReservation");
    const channelFilter = getElement("filterChannel");
    const statusFilter = getElement("filterStatus");

    const keyword = searchInput
        ? searchInput.value.toLowerCase().trim()
        : "";

    const selectedChannel = channelFilter
        ? channelFilter.value
        : "";

    const selectedStatus = statusFilter
        ? statusFilter.value
        : "";

    // Apply global filter first
    const filteredData = getFilteredBookings().filter(item => {

        const matchesSearch =
            item.id.toLowerCase().includes(keyword) ||
            item.guest.toLowerCase().includes(keyword);

        const matchesChannel =
            !selectedChannel || item.channel === selectedChannel;

        const matchesStatus =
            !selectedStatus || item.status === selectedStatus;

        return (
            matchesSearch &&
            matchesChannel &&
            matchesStatus
        );
    });

    resBody.innerHTML = "";

    if (filteredData.length === 0) {
        resBody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center text-muted py-4">
                    No reservations found.
                </td>
            </tr>
        `;
        return;
    }

    filteredData.forEach(item => {
        resBody.innerHTML += `
            <tr>
                <td><strong>${item.id}</strong></td>
                <td>${escapeHtml(item.guest)}</td>
                <td>
                    <span class="channel-badge ${item.otaClass}">
                        ${escapeHtml(item.channel)}
                    </span>
                </td>
                <td>${escapeHtml(item.room)}</td>
                <td>${Number(item.rooms) || 1}</td>
                <td>${item.checkInDate || "-"}</td>
                <td>${item.departureDate || "-"}</td>
                <td>${item.nights} Nights</td>
                <td>${formatRupiah(item.rate ?? (item.price / item.nights))}</td>
                <td>${formatRupiah(item.price)}</td>
                <td>
                    <span class="badge ${item.status}">
                        ${item.status.toUpperCase()}
                    </span>
                </td>
            </tr>
        `;
    });
}


// 14. RESET RESERVATION SEARCH FILTERS

function resetReservationFilters() {
    const searchInput = getElement("searchReservation");
    const channelFilter = getElement("filterChannel");
    const statusFilter = getElement("filterStatus");

    if (searchInput) searchInput.value = "";
    if (channelFilter) channelFilter.value = "";
    if (statusFilter) statusFilter.value = "";

    renderReservations();
}


// 15. GLOBAL FILTER EVENTS

function setupGlobalFilters() {

    const applyButton = getElement("applyGlobalFilter");
    const resetButton = getElement("resetGlobalFilter");

    const startDate = getElement("startDateFilter");
    const endDate = getElement("endDateFilter");

    if (applyButton) {
        applyButton.addEventListener("click", () => {

            if (
                startDate &&
                endDate &&
                startDate.value &&
                endDate.value &&
                startDate.value > endDate.value
            ) {
                alert("Start Date cannot be later than End Date.");
                return;
            }

            renderAllPages();
        });
    }

    if (resetButton) {
        resetButton.addEventListener("click", () => {

            const channel = getElement("globalChannelFilter");
            const dimension = getElement("dateDimensionFilter");
            const granularity = getElement("granularityFilter");

            if (channel) channel.value = "all";
            if (dimension) dimension.value = "bookingDate";
            if (startDate) startDate.value = "";
            if (endDate) endDate.value = "";
            if (granularity) granularity.value = "all";

            renderAllPages();
        });
    }
}


// 16. MOBILE SIDEBAR

function setupMobileSidebar() {

    const sidebar = getElement("sidebar");
    const overlay = getElement("sidebarOverlay");
    const mobileToggleBtn = getElement("mobileToggleBtn");
    const closeSidebarBtn = getElement("closeSidebarBtn");

    function openSidebar() {
        if (sidebar) sidebar.classList.add("show");
        if (overlay) overlay.classList.add("active");
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove("show");
        if (overlay) overlay.classList.remove("active");
    }

    if (mobileToggleBtn) {
        mobileToggleBtn.addEventListener("click", openSidebar);
    }

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener("click", closeSidebar);
    }

    if (overlay) {
        overlay.addEventListener("click", closeSidebar);
    }

    return closeSidebar;
}


// 17. INITIALIZE DASHBOARD

document.addEventListener("DOMContentLoaded", () => {

    // Initial dashboard rendering
    renderAllPages();

    // Global dashboard filters
    setupGlobalFilters();


    // Reservation search and filters
    const searchReservation = getElement("searchReservation");
    const filterChannel = getElement("filterChannel");
    const filterStatus = getElement("filterStatus");
    const resetFilter = getElement("resetFilter");

    if (searchReservation) {
        searchReservation.addEventListener("input", renderReservations);
    }

    if (filterChannel) {
        filterChannel.addEventListener("change", renderReservations);
    }

    if (filterStatus) {
        filterStatus.addEventListener("change", renderReservations);
    }

    if (resetFilter) {
        resetFilter.addEventListener("click", resetReservationFilters);
    }

    setupReservationForm();

    // Mobile sidebar
    const closeSidebar = setupMobileSidebar();


    // Navigation menu
    const navItems = document.querySelectorAll(".nav-item");
    const contentSections = document.querySelectorAll(".content-section");

    navItems.forEach(item => {

        item.addEventListener("click", event => {

            event.preventDefault();

            navItems.forEach(nav => {
                const link = nav.querySelector(".nav-link");
                if (link) link.classList.remove("active");
            });

            contentSections.forEach(section => {
                section.classList.add("d-none");
            });

            const currentLink = item.querySelector(".nav-link");

            if (currentLink) {
                currentLink.classList.add("active");
            }

            const targetId = item.getAttribute("data-target");
            const targetSection = getElement(targetId);

            if (targetSection) {
                targetSection.classList.remove("d-none");
            }

            if (closeSidebar) {
                closeSidebar();
            }
        });
    });


    // OTA sync demonstration
    const btnRefresh = getElement("btnRefresh");

    if (btnRefresh) {
        btnRefresh.addEventListener("click", () => {
            alert(
                "Demo mode: Dashboard data has been refreshed. " +
                "Live OTA API integration is not connected yet."
            );

            renderAllPages();
        });
    }

});

function setupReservationForm() {
    const form = getElement("reservationForm");
    const arrivalDate = getElement("arrivalDate");
    const departureDate = getElement("departureDate");
    const nightsInput = getElement("bookingNights");
    const rateInput = getElement("bookingRate");
    const roomsInput = getElement("bookingRooms");
    const totalAmountInput = getElement("bookingTotalAmount");

    if (!form || !arrivalDate || !departureDate || !nightsInput || !rateInput || !roomsInput || !totalAmountInput) {
        return;
    }

    function updateTotalAmount() {
        const nights = Number(nightsInput.value);
        const rate = Number(rateInput.value);
        const rooms = Number(roomsInput.value);

        totalAmountInput.value = nights > 0 && rate >= 0 && rooms > 0
            ? String(rate * nights * rooms)
            : "";
    }

    function updateDuration() {
        const arrival = arrivalDate.value;
        const departure = departureDate.value;
        departureDate.min = arrival;

        if (!arrival || !departure) {
            nightsInput.value = "";
            departureDate.setCustomValidity("");
            updateTotalAmount();
            return;
        }

        const arrivalUtc = Date.parse(`${arrival}T00:00:00Z`);
        const departureUtc = Date.parse(`${departure}T00:00:00Z`);
        const nights = (departureUtc - arrivalUtc) / 86400000;

        if (nights < 1) {
            nightsInput.value = "";
            departureDate.setCustomValidity("Departure date must be after arrival date.");
            updateTotalAmount();
            return;
        }

        departureDate.setCustomValidity("");
        nightsInput.value = nights;
        updateTotalAmount();
    }

    arrivalDate.addEventListener("change", updateDuration);
    departureDate.addEventListener("change", updateDuration);
    rateInput.addEventListener("input", updateTotalAmount);
    roomsInput.addEventListener("input", updateTotalAmount);

    form.addEventListener("submit", event => {
        event.preventDefault();
        updateDuration();
        updateTotalAmount();

        if (!form.reportValidity()) return;

        const channel = getElement("bookingChannel").value;
        const channelClasses = {
            "Traveloka": "ota-traveloka",
            "Tiket.com": "ota-tiket",
            "Agoda": "ota-agoda",
            "Booking.com": "ota-booking",
            "Expedia": "ota-expedia",
            "Trip.com": "ota-trip",
            "Direct Website": "ota-website"
        };
        const nextId = bookingData.reduce((highestId, booking) => {
            const match = booking.id.match(/^BK-(\d+)$/);
            return match ? Math.max(highestId, Number(match[1])) : highestId;
        }, 0) + 1;
        const today = new Date();
        const bookingDate = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, "0"),
            String(today.getDate()).padStart(2, "0")
        ].join("-");
        const reservation = {
            id: `BK-${nextId}`,
            guest: getElement("guestName").value.trim(),
            channel,
            otaClass: channelClasses[channel],
            room: getElement("roomType").value.trim(),
            rooms: Number(roomsInput.value),
            nights: Number(nightsInput.value),
            rate: Number(rateInput.value),
            price: Number(totalAmountInput.value),
            status: getElement("bookingStatus").value.toLowerCase(),
            bookingDate,
            checkInDate: arrivalDate.value,
            departureDate: departureDate.value
        };

        bookingData.push(reservation);
        try {
            saveBookingData();
        } catch (error) {
            bookingData.pop();
            console.error("Failed to save reservation:", error);
            alert("Reservation could not be saved. Please check browser storage settings and try again.");
            return;
        }

        renderAllPages();
        form.reset();
        nightsInput.value = "";
        departureDate.min = "";
        getElement("reservationModal").classList.remove("active");
    });
}

const reservationModal = document.getElementById("reservationModal");
const btnAddReservation = document.getElementById("btnAddReservation");
const btnCloseReservation = document.getElementById("btnCloseReservation");
const btnCancelReservation = document.getElementById("btnCancelReservation");

if (btnAddReservation && reservationModal) {
    btnAddReservation.addEventListener("click", () => {
        reservationModal.classList.add("active");
    });
}

if (btnCloseReservation && reservationModal) {
    btnCloseReservation.addEventListener("click", () => {
        reservationModal.classList.remove("active");
    });
}

if (btnCancelReservation && reservationModal) {
    btnCancelReservation.addEventListener("click", () => {
        reservationModal.classList.remove("active");
    });
}
