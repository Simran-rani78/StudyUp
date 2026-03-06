const mockUsers = [];
const mockStudies = [];

const MemoryStore = {
    users: mockUsers,
    studies: mockStudies,

    addUser: (user) => {
        const newUser = { _id: Date.now().toString(), ...user, role: 'user' };
        mockUsers.push(newUser);
        return newUser;
    },

    findUser: (email) => mockUsers.find(u => u.email === email),

    findUserById: (id) => mockUsers.find(u => u._id === id),

    addStudy: (study) => {
        const newStudy = { _id: Date.now().toString(), createdAt: new Date(), ...study };
        mockStudies.push(newStudy);
        return newStudy;
    },

    getStudies: (userId) => mockStudies.filter(s => s.user === userId),

    updateStudy: (id, data) => {
        const index = mockStudies.findIndex(s => s._id === id);
        if (index !== -1) {
            mockStudies[index] = { ...mockStudies[index], ...data };
            return mockStudies[index];
        }
        return null;
    },

    deleteStudy: (id) => {
        const index = mockStudies.findIndex(s => s._id === id);
        if (index !== -1) {
            mockStudies.splice(index, 1);
            return true;
        }
        return false;
    }
};

module.exports = MemoryStore;
