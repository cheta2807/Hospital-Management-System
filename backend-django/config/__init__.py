# Use PyMySQL (pure Python) as the MySQL driver so no C build tools are needed on
# Docker / Render / Railway. Django only needs it to look like mysqlclient.
try:
    import pymysql

    pymysql.version_info = (2, 2, 1, "final", 0)
    pymysql.install_as_MySQLdb()
except ImportError:  # pragma: no cover
    pass
