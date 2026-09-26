const API_URL = 'http://localhost:5000/api';

// ============ AUTH APIS ============

export const loginUser = async (email, password) => {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Server error!' };
    }
};

export const registerUser = async (name, email, password, role) => {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password, role })
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Register error:', error);
        return { success: false, error: error.message };
    }
};

// ============ PATIENT APIS ============

export const getPatients = async () => {
    try {
        const response = await fetch(`${API_URL}/patients/all`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching patients:', error);
        return [];
    }
};

export const addPatient = async (patientData) => {
    try {
        const response = await fetch(`${API_URL}/patients/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(patientData)
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error adding patient:', error);
        return { success: false, error: error.message };
    }
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
};