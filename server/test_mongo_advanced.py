from db_connectors import create_connector

config = {
    'database_type': 'mongodb',
    'host': 'localhost',
    'port': 27017,
    'database': 'test'
}

connector = create_connector(config)
print('Testing more MongoDB operations...')

# Test insertMany
insert_many_query = 'db.products.insertMany([{"name": "Product A", "price": 100}, {"name": "Product B", "price": 200}])'
result = connector.execute_query(insert_many_query)
print('Insert many result:', result)

# Test deleteOne
delete_one_query = 'db.products.deleteOne({"name": "Product A"})'
result = connector.execute_query(delete_one_query)
print('Delete one result:', result)

# Test find with filter
find_filtered = 'db.products.find({"price": {"$gte": 150}})'
result = connector.execute_query(find_filtered)
print('Find filtered result:', result)

# Test updateMany
update_many_query = 'db.products.updateMany({"price": {"$lt": 300}}, {"$set": {"category": "Electronics"}})'
result = connector.execute_query(update_many_query)
print('Update many result:', result)

# Test find after updateMany
result = connector.execute_query('db.products.find({})')
print('Find after updateMany:', result)

# Test deleteMany
delete_many_query = 'db.products.deleteMany({"category": "Electronics"})'
result = connector.execute_query(delete_many_query)
print('Delete many result:', result)

# Test show dbs
show_dbs_query = 'show dbs'
result = connector.execute_query(show_dbs_query)
print('Show dbs result:', result)
