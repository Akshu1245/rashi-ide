import asyncio
import fcntl
import os
import pty
import select
import signal
import struct
import termios


class TerminalManager:
    def __init__(self):
        self._sessions = {}

    def create_session(self, session_id, cols=80, rows=24):
        if session_id in self._sessions:
            self.destroy_session(session_id)

        master_fd, slave_fd = pty.openpty()
        child_pid = os.fork()
        if child_pid == 0:
            os.close(master_fd)
            os.setsid()
            os.dup2(slave_fd, 0)
            os.dup2(slave_fd, 1)
            os.dup2(slave_fd, 2)
            if slave_fd > 2:
                os.close(slave_fd)
            env = os.environ.copy()
            env["TERM"] = "xterm-256color"
            env["COLORTERM"] = "truecolor"
            os.execvpe("/bin/bash", ["/bin/bash", "--login"], env)
        else:
            os.close(slave_fd)
            self._set_winsize(master_fd, rows, cols)
            fl = fcntl.fcntl(master_fd, fcntl.F_GETFL)
            fcntl.fcntl(master_fd, fcntl.F_SETFL, fl | os.O_NONBLOCK)
            self._sessions[session_id] = {
                "fd": master_fd,
                "pid": child_pid,
            }
            return session_id

    def _set_winsize(self, fd, rows, cols):
        winsize = struct.pack("HHHH", rows, cols, 0, 0)
        fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)

    def write(self, session_id, data):
        session = self._sessions.get(session_id)
        if not session:
            return
        try:
            os.write(session["fd"], data.encode("utf-8") if isinstance(data, str) else data)
        except OSError:
            pass

    def read(self, session_id, timeout=0.05):
        session = self._sessions.get(session_id)
        if not session:
            return None
        fd = session["fd"]
        try:
            ready, _, _ = select.select([fd], [], [], timeout)
            if ready:
                return os.read(fd, 65536)
        except (OSError, ValueError):
            return None
        return b""

    def resize(self, session_id, cols, rows):
        session = self._sessions.get(session_id)
        if not session:
            return
        try:
            self._set_winsize(session["fd"], rows, cols)
        except OSError:
            pass

    def is_alive(self, session_id):
        session = self._sessions.get(session_id)
        if not session:
            return False
        try:
            pid, status = os.waitpid(session["pid"], os.WNOHANG)
            return pid == 0
        except ChildProcessError:
            return False

    def destroy_session(self, session_id):
        session = self._sessions.pop(session_id, None)
        if not session:
            return
        try:
            os.close(session["fd"])
        except OSError:
            pass
        try:
            os.kill(session["pid"], signal.SIGTERM)
        except OSError:
            pass
        try:
            os.waitpid(session["pid"], os.WNOHANG)
        except ChildProcessError:
            pass

    def destroy_all(self):
        for sid in list(self._sessions.keys()):
            self.destroy_session(sid)


terminal_manager = TerminalManager()
