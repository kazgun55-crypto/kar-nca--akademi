import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';
import { auth, db } from './firebase';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
  username?: string;
  grade?: string;
  department?: string;
  createdAt?: string;
}

// 1. Seed Initial Firestore Data if collections are empty
export async function seedFirestoreIfEmpty() {
  try {
    const teachersSnap = await getDocs(collection(db, 'teachers'));
    if (teachersSnap.empty) {
      const defaultTeachers = [
        { 
          id: '1', 
          name: 'Dr. Ahmet Yılmaz', 
          department: 'Matematik', 
          email: 'ahmet@okul.com', 
          status: 'Aktif', 
          username: 'ahmet_y', 
          password: 'password123', 
          image: 'https://picsum.photos/seed/t1/100/100',
          role: 'teacher'
        },
        { 
          id: '2', 
          name: 'Prof. Ayşe Demir', 
          department: 'Fizik', 
          email: 'ayse@okul.com', 
          status: 'Aktif', 
          username: 'ayse_d', 
          password: 'password123', 
          image: 'https://picsum.photos/seed/t2/100/100',
          role: 'teacher'
        }
      ];
      for (const t of defaultTeachers) {
        await setDoc(doc(db, 'teachers', t.id), t);
      }
    }

    const studentsSnap = await getDocs(collection(db, 'students'));
    if (studentsSnap.empty) {
      const defaultStudents = [
        { 
          id: '1', 
          name: 'Ahmet Yılmaz', 
          grade: '12. Sınıf', 
          lastTrialScore: 85.5, 
          avatar: 'https://picsum.photos/seed/s1/100/100', 
          image: 'https://picsum.photos/seed/s1/100/100',
          username: 'ahmet', 
          password: '123', 
          teacherId: '1',
          completion: 78,
          lastActive: '5 dakika önce',
          role: 'student'
        },
        { 
          id: '2', 
          name: 'Ayşe Demir', 
          grade: '11. Sınıf', 
          lastTrialScore: 72.0, 
          avatar: 'https://picsum.photos/seed/s2/100/100', 
          image: 'https://picsum.photos/seed/s2/100/100',
          username: 'ayse', 
          password: '123', 
          teacherId: '1',
          completion: 64,
          lastActive: '2 saat önce',
          role: 'student'
        },
        { 
          id: '3', 
          name: 'Can Özkan', 
          grade: '12. Sınıf', 
          lastTrialScore: 91.2, 
          avatar: 'https://picsum.photos/seed/s3/100/100', 
          image: 'https://picsum.photos/seed/s3/100/100',
          username: 'can', 
          password: '123', 
          teacherId: '1',
          completion: 88,
          lastActive: 'Bugün 10:00',
          role: 'student'
        }
      ];
      for (const s of defaultStudents) {
        await setDoc(doc(db, 'students', s.id), s);
      }
    }
  } catch (err) {
    console.warn('Firestore seeding skipped or failed:', err);
  }
}

// 2. Real Registration with Firebase Authentication & Firestore
export async function registerUser({
  email,
  password,
  name,
  role,
  username,
  grade,
  department
}: {
  email: string;
  password: string;
  name: string;
  role: 'student' | 'teacher';
  username?: string;
  grade?: string;
  department?: string;
}) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  const cleanUsername = username?.trim() || email.split('@')[0];

  const profileData: UserProfile = {
    uid: user.uid,
    email: user.email || email,
    name,
    role,
    username: cleanUsername,
    grade: grade || '12. Sınıf',
    department: department || 'Genel',
    createdAt: new Date().toISOString()
  };

  // Save in Firestore 'users' collection
  await setDoc(doc(db, 'users', user.uid), profileData);

  // If student, add to Firestore 'students'
  if (role === 'student') {
    const studentData = {
      id: user.uid,
      name,
      email: user.email,
      username: cleanUsername,
      password: '***',
      grade: grade || '12. Sınıf',
      completion: 0,
      lastActive: 'Şimdi katıldı',
      image: `https://picsum.photos/seed/${user.uid}/100/100`,
      avatar: `https://picsum.photos/seed/${user.uid}/100/100`,
      teacherId: '',
      role: 'student'
    };
    await setDoc(doc(db, 'students', user.uid), studentData);
    
    // update localStorage cache
    const existing = JSON.parse(localStorage.getItem('students') || '[]');
    localStorage.setItem('students', JSON.stringify([...existing, studentData]));
  } else if (role === 'teacher') {
    const teacherData = {
      id: user.uid,
      name,
      email: user.email,
      username: cleanUsername,
      password: '***',
      department: department || 'Genel',
      status: 'Aktif',
      image: `https://picsum.photos/seed/${user.uid}/100/100`,
      role: 'teacher'
    };
    await setDoc(doc(db, 'teachers', user.uid), teacherData);

    // update localStorage cache
    const existing = JSON.parse(localStorage.getItem('teachers') || '[]');
    localStorage.setItem('teachers', JSON.stringify([...existing, teacherData]));
  }

  // Update Auth Session LocalStorage
  localStorage.setItem('userRole', role);
  localStorage.setItem('currentUserId', user.uid);
  localStorage.setItem('currentUserName', name);
  localStorage.setItem('currentUserEmail', email);

  return profileData;
}

// 3. Real Login with Firebase Authentication
export async function loginWithFirebase(emailOrUsername: string, passwordStr: string) {
  let emailToUse = emailOrUsername.trim();

  // If username without '@', attempt lookup in Firestore or construct email
  if (!emailToUse.includes('@')) {
    try {
      const q = query(collection(db, 'users'), where('username', '==', emailToUse.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        emailToUse = snap.docs[0].data().email;
      } else {
        emailToUse = `${emailToUse}@okul.com`;
      }
    } catch {
      emailToUse = `${emailToUse}@okul.com`;
    }
  }

  const userCredential = await signInWithEmailAndPassword(auth, emailToUse, passwordStr);
  const user = userCredential.user;

  // Fetch User profile from Firestore
  let profile: any = null;
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      profile = userDoc.data();
    }
  } catch (err) {
    console.error('Error fetching user doc:', err);
  }

  const role = profile?.role || 'student';
  const name = profile?.name || user.displayName || emailToUse.split('@')[0];

  localStorage.setItem('userRole', role);
  localStorage.setItem('currentUserId', user.uid);
  localStorage.setItem('currentUserName', name);
  localStorage.setItem('currentUserEmail', user.email || '');
  if (profile?.grade) localStorage.setItem('currentUserGrade', profile.grade);

  return { user, profile };
}

// 4. Logout
export async function logoutFirebase() {
  await firebaseSignOut(auth);
  localStorage.removeItem('userRole');
  localStorage.removeItem('currentUserId');
  localStorage.removeItem('currentUserName');
  localStorage.removeItem('currentUserEmail');
  localStorage.removeItem('currentUserGrade');
}

// 5. Realtime Sync Firestore Collections to Local Storage
export function syncFirestoreToLocalStorage() {
  // Sync Teachers
  onSnapshot(collection(db, 'teachers'), (snap) => {
    if (!snap.empty) {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      localStorage.setItem('teachers', JSON.stringify(list));
    }
  });

  // Sync Students
  onSnapshot(collection(db, 'students'), (snap) => {
    if (!snap.empty) {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      localStorage.setItem('students', JSON.stringify(list));
    }
  });
}
