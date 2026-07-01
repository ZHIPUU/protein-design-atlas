import sqlite3
p=r'D:\生信\2026Protein Design\protein-design-atlas\data\design.db'
con=sqlite3.connect(p); con.row_factory=sqlite3.Row
print('rounds')
for r in con.execute('select round_key, round_number, best_score from rounds order by round_number'):
    print(dict(r))
print('\nseq counts')
for r in con.execute("select source_round, count(*) n, max(best_score) mx, min(best_score) mn from sequences group by source_round order by cast(substr(source_round,2) as int)"):
    print(dict(r))
con.close()
