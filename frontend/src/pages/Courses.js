import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import CourseCard from '../components/CourseCard';
import api from '../api';

// страница каталога — тут вся логика фильтрации
// фильтры хранятся в URL чтобы можно было скопировать ссылку с нужными параметрами

export default function Courses() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ courses: [], categories: [], levels: [], total: 0 });
  const [loading, setLoading] = useState(true);

  // читаем фильтры прямо из URL
  const category = searchParams.get('category') || '';
  const level    = searchParams.get('level')    || '';
  const search   = searchParams.get('search')   || '';
  const sort     = searchParams.get('sort')     || 'popular';

  // отдельный стейт для инпута чтобы не делать запрос на каждый символ
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => { setSearchInput(search); }, [search]);

  useEffect(() => {
    setLoading(true);
    // собираем параметры запроса вручную
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (level)    params.set('level', level);
    if (search)   params.set('search', search);
    if (sort)     params.set('sort', sort);

    api.get(`/courses?${params}`)
      .then(r => setData(r.data))
      // .catch(err => console.log('ошибка загрузки курсов', err)) // пока убрал
      .finally(() => setLoading(false));
  }, [category, level, search, sort]);

  // обновляет один фильтр не трогая остальные
  const updateFilter = (key, val) => {
    const p = new URLSearchParams(searchParams);
    if (val) p.set(key, val);
    else p.delete(key);
    setSearchParams(p);
  };

  const handleSearch = e => {
    e.preventDefault();
    updateFilter('search', searchInput);
  };

  // сбросить все фильтры разом
  const clearFilters = () => {
    setSearchParams({});
    setSearchInput('');
  };

  return (
    <div className="courses-page">
      <div className="courses-hero">
        <h1>Каталог курсов</h1>
        <form className="search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Поиск по названию, теме, технологии..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">Найти</button>
        </form>
      </div>

      <div className="courses-layout">
        {/* FILTERS */}
        <aside className="filters-panel">
          <div className="filters-header">
            <h3>Фильтры</h3>
            <button className="clear-btn" onClick={clearFilters}>Сбросить</button>
          </div>

          <div className="filter-group">
            <h4>Категория</h4>
            {data.categories.map(cat => (
              <label key={cat} className="filter-option">
                <input type="radio" name="category" checked={category === cat}
                  onChange={() => updateFilter('category', cat === category ? '' : cat)} />
                {cat}
              </label>
            ))}
          </div>

          <div className="filter-group">
            <h4>Уровень</h4>
            {['Начинающий', 'Средний', 'Продвинутый'].map(lv => (
              <label key={lv} className="filter-option">
                <input type="radio" name="level" checked={level === lv}
                  onChange={() => updateFilter('level', lv === level ? '' : lv)} />
                {lv}
              </label>
            ))}
          </div>

          <div className="filter-group">
            <h4>Сортировка</h4>
            {[
              { val: 'popular', label: 'По популярности' },
              { val: 'rating', label: 'По рейтингу' },
              { val: 'new', label: 'Новинки' },
              { val: 'price_asc', label: 'Цена: по возрастанию' },
              { val: 'price_desc', label: 'Цена: по убыванию' },
            ].map(s => (
              <label key={s.val} className="filter-option">
                <input type="radio" name="sort" checked={sort === s.val}
                  onChange={() => updateFilter('sort', s.val)} />
                {s.label}
              </label>
            ))}
          </div>
        </aside>

        {/* RESULTS */}
        <div className="courses-results">
          <div className="results-header">
            <span className="results-count">Найдено: <strong>{data.total}</strong> курсов</span>
            {(category || level || search) && (
              <div className="active-filters">
                {category && <span className="filter-tag">{category} <button onClick={() => updateFilter('category', '')}>×</button></span>}
                {level && <span className="filter-tag">{level} <button onClick={() => updateFilter('level', '')}>×</button></span>}
                {search && <span className="filter-tag">"{search}" <button onClick={() => updateFilter('search', '')}>×</button></span>}
              </div>
            )}
          </div>

          {loading ? (
            <div className="loading-grid">
              {[1,2,3,4,5,6].map(i => <div key={i} className="card-skeleton"></div>)}
            </div>
          ) : data.courses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>Курсы не найдены</h3>
              <p>Попробуйте изменить параметры поиска</p>
              <button className="btn btn-primary" onClick={clearFilters}>Сбросить фильтры</button>
            </div>
          ) : (
            <div className="courses-grid">
              {data.courses.map(c => <CourseCard key={c.id} course={c} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
