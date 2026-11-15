import pymysql

# Django checks mysqlclient version. PyMySQL is the driver; report a compatible version.
pymysql.version_info = (2, 2, 4, "final", 0)
pymysql.install_as_MySQLdb()
