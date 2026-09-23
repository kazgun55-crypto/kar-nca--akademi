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

// 1. Seed Initial Firestore Data ONCE if database is fresh
export async function seedFirestoreIfEmpty() {
  try {
    const isSeeded = localStorage.getItem('firestore_seeded');
    if (isSeeded) return;

    const usersSnap = await getDocs(collection(db, 'users'));
    if (!usersSnap.empty) {
      localStorage.setItem('firestore_seeded', 'true');
      return;
    }

    const defaultTeachers = [
      { 
        id: 'teacher_gokce', 
        name: 'Gökçe Öğretmen', 
        department: 'Matematik', 
        email: 'gokce@okul.com', 
        status: 'Aktif', 
        username: 'gokce', 
        password: '123', 
        image: 'https://picsum.photos/seed/gokce/100/100',
        role: 'teacher'
      },
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
      await setDoc(doc(db, 'teachers', t.id), t, { merge: true });
      await setDoc(doc(db, 'users', t.id), {
        uid: t.id,
        name: t.name,
        email: t.email,
        username: t.username,
        password: t.password,
        role: 'teacher',
        department: t.department
      }, { merge: true });
    }

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
        email: 'ahmet.ogrenci@okul.com',
        teacherId: 'teacher_gokce',
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
        email: 'ayse.ogrenci@okul.com',
        teacherId: 'teacher_gokce',
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
        email: 'can.ogrenci@okul.com',
        teacherId: '1',
        completion: 88,
        lastActive: 'Bugün 10:00',
        role: 'student'
      }
    ];

    for (const s of defaultStudents) {
      await setDoc(doc(db, 'students', s.id), s, { merge: true });
      await setDoc(doc(db, 'users', s.id), {
        uid: s.id,
        name: s.name,
        email: s.email,
        username: s.username,
        password: s.password,
        role: 'student',
        grade: s.grade
      }, { merge: true });
    }

    localStorage.setItem('firestore_seeded', 'true');
  } catch (err) {
    console.warn('Firestore seeding skipped or failed:', err);
  }
}

// Helper function to save a student doc in Firestore
export async function saveStudentToFirestore(studentData: any) {
  try {
    const studentId = studentData.id || Math.random().toString(36).substr(2, 9);
    const dataWithId = { ...studentData, id: studentId };
    await setDoc(doc(db, 'students', studentId), dataWithId);
    await setDoc(doc(db, 'users', studentId), {
      uid: studentId,
      name: dataWithId.name,
      email: dataWithId.email || `${dataWithId.username || studentId}@okul.com`,
      username: dataWithId.username,
      password: dataWithId.password,
      role: 'student',
      grade: dataWithId.grade || '12. Sınıf'
    });
    return dataWithId;
  } catch (err) {
    console.error('Error saving student to Firestore:', err);
    return studentData;
  }
}

// Helper function to save a teacher doc in Firestore
export async function saveTeacherToFirestore(teacherData: any) {
  try {
    const teacherId = teacherData.id || Math.random().toString(36).substr(2, 9);
    const dataWithId = { ...teacherData, id: teacherId };
    await setDoc(doc(db, 'teachers', teacherId), dataWithId);
    await setDoc(doc(db, 'users', teacherId), {
      uid: teacherId,
      name: dataWithId.name,
      email: dataWithId.email || `${dataWithId.username || teacherId}@okul.com`,
      username: dataWithId.username,
      password: dataWithId.password,
      role: 'teacher',
      department: dataWithId.department || 'Genel'
    });
    return dataWithId;
  } catch (err) {
    console.error('Error saving teacher to Firestore:', err);
    return teacherData;
  }
}

// Helper function to delete student from Firestore
export async function deleteStudentFromFirestore(studentId: string) {
  try {
    await deleteDoc(doc(db, 'students', studentId));
    await deleteDoc(doc(db, 'users', studentId));
  } catch (err) {
    console.error('Error deleting student from Firestore:', err);
  }
}

// Helper function to delete teacher from Firestore
export async function deleteTeacherFromFirestore(teacherId: string) {
  try {
    await deleteDoc(doc(db, 'teachers', teacherId));
    await deleteDoc(doc(db, 'users', teacherId));
  } catch (err) {
    console.error('Error deleting teacher from Firestore:', err);
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

// 3. Real Login with Firebase Authentication & Firestore Query Fallbacks
export async function authenticateUser(usernameOrEmail: string, passwordInput: string, selectedRole?: 'student' | 'teacher' | 'admin') {
  const cleanInput = usernameOrEmail.trim();
  const cleanLower = cleanInput.toLowerCase();
  const cleanPass = passwordInput.trim();

  // 1. Admin Credentials
  if (
    (cleanLower === 'köksal' || cleanLower === 'koksal' || cleanLower === 'admin') &&
    (cleanPass === 'köksal123' || cleanPass === 'koksal123' || cleanPass === 'admin123')
  ) {
    localStorage.setItem('userRole', 'admin');
    localStorage.setItem('currentUserId', 'admin');
    localStorage.setItem('currentUserName', 'Sistem Yöneticisi');
    return { role: 'admin', name: 'Sistem Yöneticisi', id: 'admin' };
  }

  // 2. Attempt real Firebase Authentication (Auth Service)
  try {
    let emailToUse = cleanInput;
    if (!emailToUse.includes('@')) {
      try {
        const uSnap = await getDocs(query(collection(db, 'users'), where('username', '==', cleanLower)));
        if (!uSnap.empty) {
          emailToUse = uSnap.docs[0].data().email;
        } else {
          emailToUse = `${cleanInput}@okul.com`;
        }
      } catch {
        emailToUse = `${cleanInput}@okul.com`;
      }
    }

    const userCredential = await signInWithEmailAndPassword(auth, emailToUse, cleanPass);
    const user = userCredential.user;

    let profile: any = null;
    try {
      const uDoc = await getDoc(doc(db, 'users', user.uid));
      if (uDoc.exists()) profile = uDoc.data();
    } catch {}

    const role = profile?.role || selectedRole || 'student';
    const name = profile?.name || user.displayName || cleanInput;

    localStorage.setItem('userRole', role);
    localStorage.setItem('currentUserId', user.uid);
    localStorage.setItem('currentUserName', name);
    localStorage.setItem('currentUserEmail', user.email || '');
    if (profile?.grade) localStorage.setItem('currentUserGrade', profile.grade);

    return { role, name, id: user.uid, firebaseUser: user };
  } catch (firebaseErr) {
    console.log('Firebase Auth direct login skipped/failed, checking Firestore collections...', firebaseErr);
  }

  // 3. Search Firestore 'students' collection
  try {
    const studentsSnap = await getDocs(collection(db, 'students'));
    const matchedStudentDoc = studentsSnap.docs.find(doc => {
      const data = doc.data();
      const u = (data.username || '').trim().toLowerCase();
      const e = (data.email || '').trim().toLowerCase();
      const p = (data.password || '').trim();
      return (u === cleanLower || e === cleanLower) && p === cleanPass;
    });

    if (matchedStudentDoc) {
      const data = matchedStudentDoc.data();
      localStorage.setItem('userRole', 'student');
      localStorage.setItem('currentUserId', matchedStudentDoc.id);
      localStorage.setItem('currentUserName', data.name);
      localStorage.setItem('currentUserGrade', data.grade || '12. Sınıf');
      return { role: 'student', name: data.name, id: matchedStudentDoc.id };
    }
  } catch (err) {
    console.warn('Firestore students check error:', err);
  }

  // 4. Search Firestore 'teachers' collection
  try {
    const teachersSnap = await getDocs(collection(db, 'teachers'));
    const matchedTeacherDoc = teachersSnap.docs.find(doc => {
      const data = doc.data();
      const u = (data.username || '').trim().toLowerCase();
      const e = (data.email || '').trim().toLowerCase();
      const p = (data.password || '').trim();
      return (u === cleanLower || e === cleanLower) && p === cleanPass;
    });

    if (matchedTeacherDoc) {
      const data = matchedTeacherDoc.data();
      localStorage.setItem('userRole', 'teacher');
      localStorage.setItem('currentUserId', matchedTeacherDoc.id);
      localStorage.setItem('currentUserName', data.name);
      localStorage.setItem('currentUserEmail', data.email || '');
      return { role: 'teacher', name: data.name, id: matchedTeacherDoc.id };
    }
  } catch (err) {
    console.warn('Firestore teachers check error:', err);
  }

  // 5. Search Firestore 'users' collection
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    const matchedUserDoc = usersSnap.docs.find(doc => {
      const data = doc.data();
      const u = (data.username || '').trim().toLowerCase();
      const e = (data.email || '').trim().toLowerCase();
      const p = (data.password || '').trim();
      return (u === cleanLower || e === cleanLower) && p === cleanPass;
    });

    if (matchedUserDoc) {
      const data = matchedUserDoc.data();
      const userRole = data.role || selectedRole || 'student';
      localStorage.setItem('userRole', userRole);
      localStorage.setItem('currentUserId', matchedUserDoc.id);
      localStorage.setItem('currentUserName', data.name);
      localStorage.setItem('currentUserEmail', data.email || '');
      if (data.grade) localStorage.setItem('currentUserGrade', data.grade);
      return { role: userRole, name: data.name, id: matchedUserDoc.id };
    }
  } catch (err) {
    console.warn('Firestore users check error:', err);
  }

  // 6. LocalStorage fallback
  const savedStudents = JSON.parse(localStorage.getItem('students') || '[]');
  const localStudent = savedStudents.find((s: any) =>
    ((s.username || '').trim().toLowerCase() === cleanLower || (s.email || '').trim().toLowerCase() === cleanLower) &&
    (s.password || '').trim() === cleanPass
  );

  if (localStudent) {
    localStorage.setItem('userRole', 'student');
    localStorage.setItem('currentUserId', localStudent.id);
    localStorage.setItem('currentUserName', localStudent.name);
    localStorage.setItem('currentUserGrade', localStudent.grade || '12. Sınıf');
    return { role: 'student', name: localStudent.name, id: localStudent.id };
  }

  const savedTeachers = JSON.parse(localStorage.getItem('teachers') || '[]');
  const localTeacher = savedTeachers.find((t: any) =>
    ((t.username || '').trim().toLowerCase() === cleanLower || (t.email || '').trim().toLowerCase() === cleanLower) &&
    (t.password || '').trim() === cleanPass
  );

  if (localTeacher) {
    localStorage.setItem('userRole', 'teacher');
    localStorage.setItem('currentUserId', localTeacher.id);
    localStorage.setItem('currentUserName', localTeacher.name);
    localStorage.setItem('currentUserEmail', localTeacher.email || '');
    return { role: 'teacher', name: localTeacher.name, id: localTeacher.id };
  }

  // Demo hardcoded aliases
  if (cleanLower === 'ogrenci' && cleanPass === '123') {
    localStorage.setItem('userRole', 'student');
    localStorage.setItem('currentUserId', '1');
    localStorage.setItem('currentUserName', 'Ahmet Yılmaz');
    localStorage.setItem('currentUserGrade', '12. Sınıf');
    return { role: 'student', name: 'Ahmet Yılmaz', id: '1' };
  }

  if (cleanLower === 'hoca' && cleanPass === '123') {
    localStorage.setItem('userRole', 'teacher');
    localStorage.setItem('currentUserId', '1');
    localStorage.setItem('currentUserName', 'Dr. Ahmet Yılmaz');
    localStorage.setItem('currentUserEmail', 'ahmet@okul.com');
    return { role: 'teacher', name: 'Dr. Ahmet Yılmaz', id: '1' };
  }

  throw new Error('Geçersiz kullanıcı adı/e-posta veya şifre.');
}

export async function loginWithFirebase(emailOrUsername: string, passwordStr: string) {
  return authenticateUser(emailOrUsername, passwordStr);
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

// 5. Realtime Sync & Retrieval Firestore Collections
export async function getStudentsFromFirestore(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, 'students'));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    localStorage.setItem('students', JSON.stringify(list));
    return list;
  } catch (err) {
    console.error('Error fetching students from Firestore:', err);
    return JSON.parse(localStorage.getItem('students') || '[]');
  }
}

export async function getTeachersFromFirestore(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, 'teachers'));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    localStorage.setItem('teachers', JSON.stringify(list));
    return list;
  } catch (err) {
    console.error('Error fetching teachers from Firestore:', err);
    return JSON.parse(localStorage.getItem('teachers') || '[]');
  }
}

export function subscribeStudents(callback: (students: any[]) => void) {
  return onSnapshot(collection(db, 'students'), (snap) => {
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    localStorage.setItem('students', JSON.stringify(list));
    callback(list);
  }, (err) => {
    console.error('Students snapshot error:', err);
  });
}

export function subscribeTeachers(callback: (teachers: any[]) => void) {
  return onSnapshot(collection(db, 'teachers'), (snap) => {
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    localStorage.setItem('teachers', JSON.stringify(list));
    callback(list);
  }, (err) => {
    console.error('Teachers snapshot error:', err);
  });
}

export async function updateStudentTeacherId(studentId: string, teacherId: string) {
  try {
    await setDoc(doc(db, 'students', studentId), { teacherId }, { merge: true });
  } catch (err) {
    console.error('Error updating student teacherId in Firestore:', err);
  }
}

// Helper function to sanitize any object for Firestore (strips undefined fields to prevent Firestore errors)
export function cleanForFirestore<T>(data: T): T {
  if (data === undefined) return null as any;
  return JSON.parse(JSON.stringify(data));
}

// 6. Student Tasks Persistence & Realtime Cloud Sync
export async function saveStudentTasks(studentId: string, tasks: any[]) {
  if (!studentId) return;
  const sanitizedTasks = cleanForFirestore(tasks);
  try {
    // 1. Save in Firestore students collection doc
    await setDoc(doc(db, 'students', studentId), { 
      tasks: sanitizedTasks, 
      lastTaskUpdate: new Date().toISOString() 
    }, { merge: true });

    // 2. Also save in student_tasks collection doc for dual resilience
    await setDoc(doc(db, 'student_tasks', studentId), { 
      tasks: sanitizedTasks, 
      studentId, 
      updatedAt: new Date().toISOString() 
    }, { merge: true });
    
    console.log(`[Firestore] Successfully saved ${sanitizedTasks.length} tasks for student ${studentId}`);
  } catch (err) {
    console.error('Error saving tasks to Firestore:', err);
  } finally {
    // Local cache update
    localStorage.setItem(`tasks_${studentId}`, JSON.stringify(sanitizedTasks));
    window.dispatchEvent(new Event('storage'));
  }
}

export async function getStudentById(studentId: string): Promise<any | null> {
  if (!studentId) return null;
  try {
    const sDoc = await getDoc(doc(db, 'students', studentId));
    if (sDoc.exists()) {
      return { id: sDoc.id, ...sDoc.data() };
    }
  } catch (err) {
    console.warn(`Error fetching student ${studentId} from Firestore:`, err);
  }
  const saved = localStorage.getItem('students');
  if (saved) {
    try {
      const list = JSON.parse(saved);
      return list.find((s: any) => s.id === studentId) || null;
    } catch {}
  }
  return null;
}

export async function saveGlobalAcademicTasks(tasks: any[]) {
  const sanitized = cleanForFirestore(tasks);
  try {
    await setDoc(doc(db, 'system_data', 'academic_tasks'), { 
      tasks: sanitized, 
      updatedAt: new Date().toISOString() 
    }, { merge: true });
  } catch (err) {
    console.error('Error saving global academic tasks:', err);
  } finally {
    localStorage.setItem('academic_tasks', JSON.stringify(sanitized));
  }
}

export async function getGlobalAcademicTasks(): Promise<any[]> {
  try {
    const docSnap = await getDoc(doc(db, 'system_data', 'academic_tasks'));
    if (docSnap.exists() && Array.isArray(docSnap.data()?.tasks)) {
      const tasks = docSnap.data().tasks;
      localStorage.setItem('academic_tasks', JSON.stringify(tasks));
      return tasks;
    }
  } catch (err) {
    console.warn('Error reading global academic tasks from Firestore:', err);
  }
  try {
    const local = localStorage.getItem('academic_tasks');
    return local ? JSON.parse(local) : [];
  } catch {
    return [];
  }
}

export async function getStudentTasks(studentId: string): Promise<any[]> {
  if (!studentId) return [];
  try {
    const sDoc = await getDoc(doc(db, 'students', studentId));
    if (sDoc.exists() && Array.isArray(sDoc.data()?.tasks)) {
      const tasks = sDoc.data().tasks;
      localStorage.setItem(`tasks_${studentId}`, JSON.stringify(tasks));
      return tasks;
    }

    const tDoc = await getDoc(doc(db, 'student_tasks', studentId));
    if (tDoc.exists() && Array.isArray(tDoc.data()?.tasks)) {
      const tasks = tDoc.data().tasks;
      localStorage.setItem(`tasks_${studentId}`, JSON.stringify(tasks));
      return tasks;
    }
  } catch (err) {
    console.warn('Error reading tasks from Firestore:', err);
  }

  // Fallback to local cache
  try {
    const local = localStorage.getItem(`tasks_${studentId}`);
    return local ? JSON.parse(local) : [];
  } catch {
    return [];
  }
}

export function subscribeStudentTasks(studentId: string, callback: (tasks: any[]) => void): () => void {
  if (!studentId) {
    callback([]);
    return () => {};
  }

  // Immediate cached return so UI never flickers
  try {
    const cached = localStorage.getItem(`tasks_${studentId}`);
    if (cached) {
      callback(JSON.parse(cached));
    }
  } catch {}

  let unsub1 = () => {};
  let unsub2 = () => {};

  // 1. Realtime onSnapshot listener on 'students' document
  try {
    unsub1 = onSnapshot(doc(db, 'students', studentId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && Array.isArray(data.tasks)) {
          localStorage.setItem(`tasks_${studentId}`, JSON.stringify(data.tasks));
          callback(data.tasks);
        }
      }
    }, (err) => {
      console.warn(`[Firestore] onSnapshot error on students/${studentId}:`, err);
    });
  } catch (err) {
    console.warn(`[Firestore] Error subscribing to students/${studentId}:`, err);
  }

  // 2. Realtime onSnapshot listener on 'student_tasks' document
  try {
    unsub2 = onSnapshot(doc(db, 'student_tasks', studentId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && Array.isArray(data.tasks)) {
          localStorage.setItem(`tasks_${studentId}`, JSON.stringify(data.tasks));
          callback(data.tasks);
        }
      }
    }, (err) => {
      console.warn(`[Firestore] onSnapshot error on student_tasks/${studentId}:`, err);
    });
  } catch (err) {
    console.warn(`[Firestore] Error subscribing to student_tasks/${studentId}:`, err);
  }

  return () => {
    unsub1();
    unsub2();
  };
}

// 7. Student Archived Programs Cloud Sync
export async function saveStudentArchivedPrograms(studentId: string, archives: any[]) {
  if (!studentId) return;
  try {
    await setDoc(doc(db, 'students', studentId), { archivedPrograms: archives }, { merge: true });
  } catch (err) {
    console.error('Error saving archived programs to Firestore:', err);
  } finally {
    localStorage.setItem(`archived_programs_${studentId}`, JSON.stringify(archives));
  }
}

export function syncFirestoreToLocalStorage() {
  // Sync Teachers
  onSnapshot(collection(db, 'teachers'), (snap) => {
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    localStorage.setItem('teachers', JSON.stringify(list));
  });

  // Sync Students & Auto-migrate any local tasks to cloud
  onSnapshot(collection(db, 'students'), (snap) => {
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    localStorage.setItem('students', JSON.stringify(list));

    list.forEach((s: any) => {
      if (s.tasks && Array.isArray(s.tasks) && s.tasks.length > 0) {
        localStorage.setItem(`tasks_${s.id}`, JSON.stringify(s.tasks));
      } else {
        // If Firestore doc has no tasks yet, but localStorage has tasks for this student, push to Firestore
        const local = localStorage.getItem(`tasks_${s.id}`);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setDoc(doc(db, 'students', s.id), { tasks: parsed }, { merge: true });
            }
          } catch {}
        }
      }

      if (s.archivedPrograms && Array.isArray(s.archivedPrograms)) {
        localStorage.setItem(`archived_programs_${s.id}`, JSON.stringify(s.archivedPrograms));
      }
    });
  });
}

