import os
import sqlite3
from flask import (Flask, render_template, request, redirect,
                   url_for, send_file, flash)
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = 'bookshelf-secret-key-2025'

DATABASE = os.path.join(os.path.dirname(__file__), 'bookshelf.db')
COVERS_DIR = os.path.join(os.path.dirname(__file__), 'static', 'covers')
ALLOWED_IMAGE_EXT = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS books (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT NOT NULL,
            author      TEXT DEFAULT '',
            genre       TEXT DEFAULT '',
            description TEXT DEFAULT '',
            pdf_path    TEXT DEFAULT '',
            cover_file  TEXT DEFAULT '',
            added_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()


def allowed_image(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXT


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    q = request.args.get('q', '').strip()
    genre = request.args.get('genre', '').strip()
    conn = get_db()

    if q:
        books = conn.execute(
            'SELECT * FROM books WHERE title LIKE ? OR author LIKE ? ORDER BY title',
            (f'%{q}%', f'%{q}%')
        ).fetchall()
    elif genre:
        books = conn.execute(
            'SELECT * FROM books WHERE genre = ? ORDER BY title', (genre,)
        ).fetchall()
    else:
        books = conn.execute('SELECT * FROM books ORDER BY title').fetchall()

    genres = [r['genre'] for r in conn.execute(
        "SELECT DISTINCT genre FROM books WHERE genre != '' ORDER BY genre"
    ).fetchall()]
    conn.close()
    return render_template('index.html', books=books, query=q,
                           genres=genres, selected_genre=genre)


@app.route('/book/<int:book_id>')
def book_detail(book_id):
    conn = get_db()
    book = conn.execute('SELECT * FROM books WHERE id = ?', (book_id,)).fetchone()
    conn.close()
    if not book:
        flash('Book not found.', 'error')
        return redirect(url_for('index'))
    return render_template('book_detail.html', book=book)


@app.route('/book/<int:book_id>/pdf')
def serve_pdf(book_id):
    conn = get_db()
    book = conn.execute('SELECT * FROM books WHERE id = ?', (book_id,)).fetchone()
    conn.close()
    if not book or not book['pdf_path']:
        return 'No PDF linked to this book.', 404
    path = os.path.expanduser(book['pdf_path'])
    if not os.path.isfile(path):
        return f'PDF file not found on disk: {path}', 404
    return send_file(path, mimetype='application/pdf')


@app.route('/add', methods=['GET', 'POST'])
def add_book():
    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        if not title:
            flash('Title is required.', 'error')
            return render_template('add_book.html', form=request.form)

        author = request.form.get('author', '').strip()
        genre = request.form.get('genre', '').strip()
        description = request.form.get('description', '').strip()
        pdf_path = request.form.get('pdf_path', '').strip()

        cover_file = ''
        upload = request.files.get('cover')
        if upload and upload.filename and allowed_image(upload.filename):
            os.makedirs(COVERS_DIR, exist_ok=True)
            fname = secure_filename(upload.filename)
            upload.save(os.path.join(COVERS_DIR, fname))
            cover_file = fname

        conn = get_db()
        conn.execute(
            'INSERT INTO books (title, author, genre, description, pdf_path, cover_file) '
            'VALUES (?, ?, ?, ?, ?, ?)',
            (title, author, genre, description, pdf_path, cover_file)
        )
        conn.commit()
        conn.close()
        flash(f'"{title}" added to your shelf!', 'success')
        return redirect(url_for('index'))

    return render_template('add_book.html', form={})


@app.route('/book/<int:book_id>/edit', methods=['GET', 'POST'])
def edit_book(book_id):
    conn = get_db()
    book = conn.execute('SELECT * FROM books WHERE id = ?', (book_id,)).fetchone()
    if not book:
        conn.close()
        return redirect(url_for('index'))

    if request.method == 'POST':
        title = request.form.get('title', '').strip()
        if not title:
            flash('Title is required.', 'error')
            conn.close()
            return render_template('edit_book.html', book=book)

        author = request.form.get('author', '').strip()
        genre = request.form.get('genre', '').strip()
        description = request.form.get('description', '').strip()
        pdf_path = request.form.get('pdf_path', '').strip()

        cover_file = book['cover_file']
        upload = request.files.get('cover')
        if upload and upload.filename and allowed_image(upload.filename):
            os.makedirs(COVERS_DIR, exist_ok=True)
            fname = secure_filename(upload.filename)
            upload.save(os.path.join(COVERS_DIR, fname))
            cover_file = fname

        conn.execute(
            'UPDATE books SET title=?, author=?, genre=?, description=?, pdf_path=?, cover_file=? WHERE id=?',
            (title, author, genre, description, pdf_path, cover_file, book_id)
        )
        conn.commit()
        conn.close()
        flash(f'"{title}" updated.', 'success')
        return redirect(url_for('book_detail', book_id=book_id))

    conn.close()
    return render_template('edit_book.html', book=book)


@app.route('/book/<int:book_id>/delete', methods=['POST'])
def delete_book(book_id):
    conn = get_db()
    book = conn.execute('SELECT * FROM books WHERE id = ?', (book_id,)).fetchone()
    if book:
        conn.execute('DELETE FROM books WHERE id = ?', (book_id,))
        conn.commit()
        flash(f'"{book["title"]}" removed from your shelf.', 'success')
    conn.close()
    return redirect(url_for('index'))


if __name__ == '__main__':
    os.makedirs(COVERS_DIR, exist_ok=True)
    init_db()
    print('\n  Bookshelf running at http://127.0.0.1:5000\n')
    app.run(debug=True, port=5000)
